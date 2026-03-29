from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi.middleware.cors import CORSMiddleware

from app.fetchers import fetch_from_github, search_external_products
from app.importers import import_cyclonedx_json, import_spdx_json
from app.database import Base, SessionLocal, engine
from app import models
from app.schemas import (
    ItemResponse,
    ItemDetailResponse,
    CompareResponse,
    ReverseLookupItemResponse,
    StatsResponse,
    AdvancedCompareResponse,
    TrackedProductCreate,
    TrackedProductResponse,
    SearchWithExternalResponse,
    ExternalItemCreate,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SBOM Finder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def build_item_detail(item):
    component_list = []
    for link in item.components:
        comp = link.component
        component_list.append(
            {
                "component_name": comp.component_name,
                "version": comp.version,
                "supplier": comp.supplier,
                "license": comp.license,
            }
        )

    return {
        "id": item.id,
        "name": item.name,
        "item_type": item.item_type,
        "category": item.category,
        "manufacturer": item.manufacturer,
        "developer": item.developer,
        "operating_system": item.operating_system,
        "description": item.description,
        "owner": item.owner,
        "version": item.version,
        "source_format": item.source_format,
        "source_name": item.source_name,
        "components": component_list,
    }


@app.get("/")
def read_root():
    return {"message": "SBOM Finder Backend Running"}


@app.get("/items", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()


@app.get("/items/{item_id}", response_model=ItemDetailResponse)
def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return build_item_detail(item)


@app.get("/search", response_model=list[ItemResponse])
def search_items(
    q: str | None = None,
    name: str | None = None,
    item_type: str | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    developer: str | None = None,
    operating_system: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)

    if item_type:
        query = query.filter(models.Item.item_type.ilike(f"%{item_type}%"))

    if manufacturer:
        query = query.filter(models.Item.manufacturer.ilike(f"%{manufacturer}%"))

    if category:
        query = query.filter(models.Item.category.ilike(f"%{category}%"))

    if developer:
        query = query.filter(models.Item.developer.ilike(f"%{developer}%"))

    if operating_system:
        query = query.filter(models.Item.operating_system.ilike(f"%{operating_system}%"))

    if name:
        query = query.filter(models.Item.name.ilike(f"%{name}%"))

    if q:
        tokens = [token.strip() for token in q.split() if token.strip()]
        for token in tokens:
            token_filter = or_(
                models.Item.name.ilike(f"%{token}%"),
                models.Item.category.ilike(f"%{token}%"),
                models.Item.manufacturer.ilike(f"%{token}%"),
                models.Item.developer.ilike(f"%{token}%"),
                models.Item.operating_system.ilike(f"%{token}%"),
                models.Item.description.ilike(f"%{token}%"),
            )
            query = query.filter(token_filter)

    return query.all()


@app.get("/search-smart", response_model=SearchWithExternalResponse)
def search_items_smart(
    q: str,
    item_type: str | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    developer: str | None = None,
    operating_system: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)

    if item_type:
        query = query.filter(models.Item.item_type.ilike(f"%{item_type}%"))

    if manufacturer:
        query = query.filter(models.Item.manufacturer.ilike(f"%{manufacturer}%"))

    if category:
        query = query.filter(models.Item.category.ilike(f"%{category}%"))

    if developer:
        query = query.filter(models.Item.developer.ilike(f"%{developer}%"))

    if operating_system:
        query = query.filter(models.Item.operating_system.ilike(f"%{operating_system}%"))

    tokens = [token.strip() for token in q.split() if token.strip()]
    for token in tokens:
        token_filter = or_(
            models.Item.name.ilike(f"%{token}%"),
            models.Item.category.ilike(f"%{token}%"),
            models.Item.manufacturer.ilike(f"%{token}%"),
            models.Item.developer.ilike(f"%{token}%"),
            models.Item.operating_system.ilike(f"%{token}%"),
            models.Item.description.ilike(f"%{token}%"),
        )
        query = query.filter(token_filter)

    local_results = query.all()

    external_results = []
    if len(local_results) == 0:
        external_results = search_external_products(q)

    return {
        "local_results": local_results,
        "external_results": external_results,
    }


@app.post("/external-items/import", response_model=ItemResponse)
def import_external_item(payload: ExternalItemCreate, db: Session = Depends(get_db)):
    name_to_use = payload.full_name or payload.name

    existing_item = (
        db.query(models.Item)
        .filter(
            models.Item.name == name_to_use,
            models.Item.source_format == "external",
        )
        .first()
    )

    if existing_item:
        return existing_item

    new_item = models.Item(
        name=name_to_use,
        item_type=payload.item_type or "application",
        category="External Suggestion",
        manufacturer=payload.owner,
        developer=payload.owner,
        operating_system=None,
        description=payload.description or "Imported from external search suggestion.",
        owner=payload.owner,
        version=None,
        source_format="external",
        source_name=payload.source or "GitHub",
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    default_components = [
        ("external-metadata-record", None, payload.source or "External", "N/A"),
        ("source-link", None, payload.url or "N/A", "N/A"),
    ]

    for comp_name, comp_version, comp_supplier, comp_license in default_components:
        existing_component = (
            db.query(models.Component)
            .filter(
                models.Component.component_name == comp_name,
                models.Component.version == comp_version,
            )
            .first()
        )

        if existing_component:
            component_record = existing_component
        else:
            component_record = models.Component(
                component_name=comp_name,
                version=comp_version,
                supplier=comp_supplier,
                license=comp_license,
            )
            db.add(component_record)
            db.commit()
            db.refresh(component_record)

        link_exists = (
            db.query(models.ItemComponent)
            .filter(
                models.ItemComponent.item_id == new_item.id,
                models.ItemComponent.component_id == component_record.id,
            )
            .first()
        )

        if not link_exists:
            db.add(
                models.ItemComponent(
                    item_id=new_item.id,
                    component_id=component_record.id,
                )
            )
            db.commit()

    return new_item


@app.get("/compare", response_model=CompareResponse)
def compare_items(item1: int, item2: int, db: Session = Depends(get_db)):
    first_item = db.query(models.Item).filter(models.Item.id == item1).first()
    second_item = db.query(models.Item).filter(models.Item.id == item2).first()

    if not first_item or not second_item:
        raise HTTPException(status_code=404, detail="One or both items not found")

    first_components = {link.component.component_name for link in first_item.components}
    second_components = {link.component.component_name for link in second_item.components}

    common_components = sorted(list(first_components & second_components))
    unique_to_item_1 = sorted(list(first_components - second_components))
    unique_to_item_2 = sorted(list(second_components - first_components))

    return {
        "item_1": first_item.name,
        "item_2": second_item.name,
        "common_components": common_components,
        "unique_to_item_1": unique_to_item_1,
        "unique_to_item_2": unique_to_item_2,
    }


@app.get("/compare-multi", response_model=AdvancedCompareResponse)
def compare_multiple_items(item_ids: str, db: Session = Depends(get_db)):
    raw_ids = [x.strip() for x in item_ids.split(",") if x.strip()]

    try:
        id_list = list(dict.fromkeys(int(x) for x in raw_ids))
    except ValueError:
        raise HTTPException(status_code=400, detail="item_ids must be integers")

    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 items to compare")

    if len(id_list) > 4:
        raise HTTPException(status_code=400, detail="You can compare at most 4 items")

    items = db.query(models.Item).filter(models.Item.id.in_(id_list)).all()

    if len(items) != len(id_list):
        raise HTTPException(status_code=404, detail="One or more selected items were not found")

    selected_item_names = [item.name for item in items]
    total_selected = len(selected_item_names)

    component_map = {}

    for item in items:
        for link in item.components:
            comp = link.component
            component_name = comp.component_name

            if component_name not in component_map:
                component_map[component_name] = {}

            component_map[component_name][item.name] = {
                "version": comp.version,
                "license": comp.license,
                "supplier": comp.supplier,
            }

    comparison_rows = []

    for component_name, item_details in component_map.items():
        count_present = len(item_details)

        if count_present == total_selected:
            category = "common"
        elif count_present == 1:
            category = "unique"
        else:
            category = "partial"

        comparison_rows.append(
            {
                "component_name": component_name,
                "category": category,
                "item_details": item_details,
            }
        )

    comparison_rows = sorted(comparison_rows, key=lambda x: x["component_name"].lower())

    return {
        "selected_items": selected_item_names,
        "comparison_rows": comparison_rows,
    }


@app.get("/reverse-search", response_model=list[ReverseLookupItemResponse])
def reverse_search(
    component_name: str,
    item_type: str | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    component_matches = (
        db.query(models.Component)
        .filter(models.Component.component_name.ilike(f"%{component_name}%"))
        .all()
    )

    if not component_matches:
        return []

    found_items = []
    seen_ids = set()

    for component in component_matches:
        for link in component.items:
            item = link.item

            if item.id in seen_ids:
                continue

            if item_type and (not item.item_type or item_type.lower() not in item.item_type.lower()):
                continue

            if manufacturer and (
                not item.manufacturer
                or manufacturer.lower() not in item.manufacturer.lower()
            ):
                continue

            if category and (not item.category or category.lower() not in item.category.lower()):
                continue

            found_items.append(item)
            seen_ids.add(item.id)

    return found_items


@app.get("/components/{component_name}", response_model=list[ReverseLookupItemResponse])
def reverse_lookup(component_name: str, db: Session = Depends(get_db)):
    component = (
        db.query(models.Component)
        .filter(models.Component.component_name.ilike(f"%{component_name}%"))
        .first()
    )

    if not component:
        return []

    items = [link.item for link in component.items]
    return items


@app.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_items = db.query(models.Item).count()
    total_devices = db.query(models.Item).filter(models.Item.item_type == "device").count()
    total_applications = db.query(models.Item).filter(models.Item.item_type == "application").count()
    total_components = db.query(models.Component).count()
    total_tracked_products = db.query(models.TrackedProduct).count()

    return {
        "total_items": total_items,
        "total_devices": total_devices,
        "total_applications": total_applications,
        "total_components": total_components,
        "total_tracked_products": total_tracked_products,
    }


@app.post("/import/cyclonedx")
async def import_cyclonedx(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    data = json.loads(content.decode("utf-8"))
    item = import_cyclonedx_json(data, db)

    return {
        "message": "CycloneDX file imported successfully",
        "item_id": item.id,
        "item_name": item.name,
    }


@app.post("/import/spdx")
async def import_spdx(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    data = json.loads(content.decode("utf-8"))
    item = import_spdx_json(data, db)

    return {
        "message": "SPDX file imported successfully",
        "item_id": item.id,
        "item_name": item.name,
    }


@app.get("/tracked-products", response_model=list[TrackedProductResponse])
def get_tracked_products(db: Session = Depends(get_db)):
    tracked_products = (
        db.query(models.TrackedProduct)
        .order_by(models.TrackedProduct.created_at.desc())
        .all()
    )
    return tracked_products


@app.get("/tracked-products/{tracked_product_id}", response_model=TrackedProductResponse)
def get_tracked_product(tracked_product_id: int, db: Session = Depends(get_db)):
    tracked_product = (
        db.query(models.TrackedProduct)
        .filter(models.TrackedProduct.id == tracked_product_id)
        .first()
    )

    if not tracked_product:
        raise HTTPException(status_code=404, detail="Tracked product not found")

    return tracked_product


@app.post("/tracked-products", response_model=TrackedProductResponse)
def create_tracked_product(payload: TrackedProductCreate, db: Session = Depends(get_db)):
    tracked_product = models.TrackedProduct(
        name=payload.name,
        product_type=payload.product_type,
        vendor=payload.vendor,
        notes=payload.notes,
        status="pending",
    )

    db.add(tracked_product)
    db.commit()
    db.refresh(tracked_product)

    github_data = fetch_from_github(payload.name)

    if github_data:
        source = models.SourceRecord(
            tracked_product_id=tracked_product.id,
            source_type=github_data["source_type"],
            source_title=github_data["source_title"],
            source_url=github_data["source_url"],
            fetch_status="success",
            confidence=github_data["confidence"],
        )

        db.add(source)
        tracked_product.status = "partial"
        db.commit()
        db.refresh(tracked_product)

    return tracked_product