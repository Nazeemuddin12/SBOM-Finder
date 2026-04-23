from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi.middleware.cors import CORSMiddleware
from app.ai_discoverer import discover_sbom_with_ai, save_discovered_sbom
import os

from app.auth import (
    hash_password, verify_password, create_access_token, get_current_user, get_db,
)
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
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
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


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "SBOM Finder Beta API Running"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=TokenResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            is_active=user.is_active,
        ),
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            is_active=user.is_active,
        ),
    )


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/auth/make-admin")
def make_admin(payload: dict, db: Session = Depends(get_db)):
    secret = payload.get("secret")
    username = payload.get("username")
    if secret != os.getenv("ADMIN_SECRET", "sbom-secret-2026"):
        raise HTTPException(status_code=403, detail="Invalid secret")
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "admin"
    db.commit()
    return {"message": f"{username} is now admin", "role": user.role}


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------

@app.get("/items", response_model=list[ItemResponse])
def get_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Item)
        .filter(models.Item.user_id == current_user.id)
        .all()
    )


@app.get("/items/{item_id}", response_model=ItemDetailResponse)
def get_item_detail(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return build_item_detail(item)

@app.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.query(models.ItemComponent).filter(
        models.ItemComponent.item_id == item_id
    ).delete()

    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

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
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Item).filter(models.Item.user_id == current_user.id)

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
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Item).filter(models.Item.user_id == current_user.id)

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


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------

@app.get("/compare", response_model=CompareResponse)
def compare_items(
    item1: int,
    item2: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    first_item = db.query(models.Item).filter(
        models.Item.id == item1,
        models.Item.user_id == current_user.id,
    ).first()
    second_item = db.query(models.Item).filter(
        models.Item.id == item2,
        models.Item.user_id == current_user.id,
    ).first()

    if not first_item or not second_item:
        raise HTTPException(status_code=404, detail="One or both items not found")

    first_components = {link.component.component_name for link in first_item.components}
    second_components = {link.component.component_name for link in second_item.components}

    return {
        "item_1": first_item.name,
        "item_2": second_item.name,
        "common_components": sorted(list(first_components & second_components)),
        "unique_to_item_1": sorted(list(first_components - second_components)),
        "unique_to_item_2": sorted(list(second_components - first_components)),
    }


@app.get("/compare-multi", response_model=AdvancedCompareResponse)
def compare_multiple_items(
    item_ids: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    raw_ids = [x.strip() for x in item_ids.split(",") if x.strip()]
    try:
        id_list = list(dict.fromkeys(int(x) for x in raw_ids))
    except ValueError:
        raise HTTPException(status_code=400, detail="item_ids must be integers")

    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 items to compare")
    if len(id_list) > 4:
        raise HTTPException(status_code=400, detail="You can compare at most 4 items")

    items = db.query(models.Item).filter(
        models.Item.id.in_(id_list),
        models.Item.user_id == current_user.id,
    ).all()

    if len(items) != len(id_list):
        raise HTTPException(status_code=404, detail="One or more items not found")

    selected_item_names = [item.name for item in items]
    total_selected = len(selected_item_names)
    component_map = {}

    for item in items:
        for link in item.components:
            comp = link.component
            if comp.component_name not in component_map:
                component_map[comp.component_name] = {}
            component_map[comp.component_name][item.name] = {
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
        comparison_rows.append({
            "component_name": component_name,
            "category": category,
            "item_details": item_details,
        })

    comparison_rows = sorted(comparison_rows, key=lambda x: x["component_name"].lower())
    return {"selected_items": selected_item_names, "comparison_rows": comparison_rows}


# ---------------------------------------------------------------------------
# Reverse search
# ---------------------------------------------------------------------------

@app.get("/reverse-search", response_model=list[ReverseLookupItemResponse])
def reverse_search(
    component_name: str,
    item_type: str | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
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
            if item.user_id != current_user.id:
                continue
            if item_type and (not item.item_type or item_type.lower() not in item.item_type.lower()):
                continue
            if manufacturer and (not item.manufacturer or manufacturer.lower() not in item.manufacturer.lower()):
                continue
            if category and (not item.category or category.lower() not in item.category.lower()):
                continue
            found_items.append(item)
            seen_ids.add(item.id)

    return found_items


@app.get("/components/{component_name}", response_model=list[ReverseLookupItemResponse])
def reverse_lookup(
    component_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    component = (
        db.query(models.Component)
        .filter(models.Component.component_name.ilike(f"%{component_name}%"))
        .first()
    )
    if not component:
        return []
    items = [link.item for link in component.items if link.item.user_id == current_user.id]
    return items


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@app.get("/stats", response_model=StatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_items = db.query(models.Item).filter(models.Item.user_id == current_user.id)
    return {
        "total_items": user_items.count(),
        "total_devices": user_items.filter(models.Item.item_type == "device").count(),
        "total_applications": user_items.filter(models.Item.item_type == "application").count(),
        "total_components": db.query(models.Component).count(),
        "total_tracked_products": db.query(models.TrackedProduct).filter(
            models.TrackedProduct.user_id == current_user.id
        ).count(),
        "total_ai_discovered": user_items.filter(
            models.Item.source_format == "ai_discovered"
        ).count(),
        "total_users": db.query(models.User).count(),
    }

@app.get("/components-list")
def get_all_components(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get components that belong to this user's items
    user_item_ids = [
        item.id for item in
        db.query(models.Item).filter(models.Item.user_id == current_user.id).all()
    ]
    
    if not user_item_ids:
        return []

    component_ids = db.query(models.ItemComponent.component_id).filter(
        models.ItemComponent.item_id.in_(user_item_ids)
    ).distinct().all()

    component_id_list = [c[0] for c in component_ids]

    components = db.query(models.Component).filter(
        models.Component.id.in_(component_id_list)
    ).all()

    return [
        {
            "id": c.id,
            "component_name": c.component_name,
            "version": c.version,
            "supplier": c.supplier,
            "license": c.license,
        }
        for c in components
    ]


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

@app.post("/import/cyclonedx")
async def import_cyclonedx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = await file.read()
    data = json.loads(content.decode("utf-8"))
    item = import_cyclonedx_json(data, db, user_id=current_user.id)
    return {
        "message": "CycloneDX file imported successfully",
        "item_id": item.id,
        "item_name": item.name,
    }


@app.post("/import/spdx")
async def import_spdx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = await file.read()
    data = json.loads(content.decode("utf-8"))
    item = import_spdx_json(data, db, user_id=current_user.id)
    return {
        "message": "SPDX file imported successfully",
        "item_id": item.id,
        "item_name": item.name,
    }


# ---------------------------------------------------------------------------
# Tracked products
# ---------------------------------------------------------------------------

@app.get("/tracked-products", response_model=list[TrackedProductResponse])
def get_tracked_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.TrackedProduct)
        .filter(models.TrackedProduct.user_id == current_user.id)
        .order_by(models.TrackedProduct.created_at.desc())
        .all()
    )


@app.get("/tracked-products/{tracked_product_id}", response_model=TrackedProductResponse)
def get_tracked_product(
    tracked_product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tracked_product = (
        db.query(models.TrackedProduct)
        .filter(
            models.TrackedProduct.id == tracked_product_id,
            models.TrackedProduct.user_id == current_user.id,
        )
        .first()
    )
    if not tracked_product:
        raise HTTPException(status_code=404, detail="Tracked product not found")
    return tracked_product


@app.post("/tracked-products", response_model=TrackedProductResponse)
def create_tracked_product(
    payload: TrackedProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tracked_product = models.TrackedProduct(
        user_id=current_user.id,
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


# ---------------------------------------------------------------------------
# External items
# ---------------------------------------------------------------------------

@app.post("/external-items/import", response_model=ItemResponse)
def import_external_item(
    payload: ExternalItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    name_to_use = payload.full_name or payload.name
    existing_item = (
        db.query(models.Item)
        .filter(
            models.Item.name == name_to_use,
            models.Item.source_format == "external",
            models.Item.user_id == current_user.id,
        )
        .first()
    )
    if existing_item:
        return existing_item

    new_item = models.Item(
        user_id=current_user.id,
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
    return new_item

# ---------------------------------------------------------------------------
# AI Discovery
# ---------------------------------------------------------------------------

@app.post("/discover")
def discover_sbom(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured on server")
        sbom_data = discover_sbom_with_ai(query, api_key=api_key)
        item = save_discovered_sbom(sbom_data, db, user_id=current_user.id)
        return {
            "message": f"SBOM discovered for {sbom_data['name']}",
            "item_id": item.id,
            "item_name": item.name,
            "components_found": len(sbom_data.get("components", [])),
            "category": sbom_data.get("category"),
            "license": sbom_data.get("license"),
            "description": sbom_data.get("description"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")
    
    # ---------------------------------------------------------------------------
# Admin helper
# ---------------------------------------------------------------------------

from datetime import datetime

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def log_action(db, user_id, action, resource_type=None, resource_id=None, details=None):
    try:
        log = models.AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Public catalog
# ---------------------------------------------------------------------------

@app.get("/public/items")
def get_public_items(
    q: str | None = None,
    category: str | None = None,
    item_type: str | None = None,
    verified_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Item).filter(
        models.Item.is_public == True,
        models.Item.approval_status == "approved",
    )
    if q:
        query = query.filter(
            or_(
                models.Item.name.ilike(f"%{q}%"),
                models.Item.description.ilike(f"%{q}%"),
                models.Item.manufacturer.ilike(f"%{q}%"),
                models.Item.category.ilike(f"%{q}%"),
            )
        )
    if category:
        query = query.filter(models.Item.category.ilike(f"%{category}%"))
    if item_type:
        query = query.filter(models.Item.item_type == item_type)
    if verified_only:
        query = query.filter(models.Item.is_verified == True)

    items = query.order_by(
        models.Item.is_featured.desc(),
        models.Item.upvotes.desc()
    ).all()

    result = []
    for item in items:
        component_count = db.query(models.ItemComponent).filter(
            models.ItemComponent.item_id == item.id
        ).count()
        result.append({
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "category": item.category,
            "manufacturer": item.manufacturer,
            "developer": item.developer,
            "description": item.description,
            "version": item.version,
            "source_format": item.source_format,
            "is_verified": item.is_verified,
            "is_featured": item.is_featured,
            "upvotes": item.upvotes,
            "component_count": component_count,
        })
    return result


@app.get("/public/items/{item_id}")
def get_public_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.is_public == True,
        models.Item.approval_status == "approved",
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return build_item_detail(item)


@app.get("/public/stats")
def get_public_stats(db: Session = Depends(get_db)):
    total_public = db.query(models.Item).filter(
        models.Item.is_public == True,
        models.Item.approval_status == "approved",
    ).count()
    total_verified = db.query(models.Item).filter(
        models.Item.is_verified == True,
        models.Item.is_public == True,
    ).count()
    total_components = db.query(models.Component).count()
    total_users = db.query(models.User).count()
    return {
        "total_public_items": total_public,
        "total_verified": total_verified,
        "total_components": total_components,
        "total_users": total_users,
    }


@app.get("/public/reverse-search")
def public_reverse_search(component_name: str, db: Session = Depends(get_db)):
    component_matches = db.query(models.Component).filter(
        models.Component.component_name.ilike(f"%{component_name}%")
    ).all()
    if not component_matches:
        return []
    found_items = []
    seen_ids = set()
    for component in component_matches:
        for link in component.items:
            item = link.item
            if item.id in seen_ids:
                continue
            if not item.is_public or item.approval_status != "approved":
                continue
            found_items.append({
                "id": item.id,
                "name": item.name,
                "item_type": item.item_type,
                "manufacturer": item.manufacturer,
                "is_verified": item.is_verified,
            })
            seen_ids.add(item.id)
    return found_items


@app.post("/public/items/{item_id}/upvote")
def upvote_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.is_public == True,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.upvotes = (item.upvotes or 0) + 1
    db.commit()
    return {"upvotes": item.upvotes}


@app.post("/items/{item_id}/submit-public")
def submit_to_public(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.approval_status = "pending"
    item.public_submitted_at = datetime.utcnow()
    db.commit()
    log_action(db, current_user.id, "submit_to_public", "item", item_id)
    return {"message": "Submitted for admin review"}

@app.post("/public/items/{item_id}/copy-to-workspace")
def copy_public_to_workspace(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get the public item
    public_item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.is_public == True,
        models.Item.approval_status == "approved",
    ).first()
    if not public_item:
        raise HTTPException(status_code=404, detail="Public item not found")

    # Check if user already has a copy
    existing = db.query(models.Item).filter(
        models.Item.user_id == current_user.id,
        models.Item.name == public_item.name,
        models.Item.source_format == public_item.source_format,
    ).first()
    if existing:
        return {"message": "Already in your workspace", "item_id": existing.id}

    # Create a copy for the user
    new_item = models.Item(
        user_id=current_user.id,
        name=public_item.name,
        item_type=public_item.item_type,
        category=public_item.category,
        manufacturer=public_item.manufacturer,
        developer=public_item.developer,
        operating_system=public_item.operating_system,
        description=public_item.description,
        owner=public_item.owner,
        version=public_item.version,
        source_format=public_item.source_format,
        source_name=public_item.source_name,
        is_public=False,
        approval_status="private",
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Copy all components
    for link in public_item.components:
        existing_link = db.query(models.ItemComponent).filter(
            models.ItemComponent.item_id == new_item.id,
            models.ItemComponent.component_id == link.component_id,
        ).first()
        if not existing_link:
            db.add(models.ItemComponent(
                item_id=new_item.id,
                component_id=link.component_id,
            ))
    db.commit()

    return {
        "message": f"{public_item.name} copied to your workspace",
        "item_id": new_item.id,
    }

@app.post("/items/{item_id}/make-private")
def make_item_private(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.Item).filter(
        models.Item.id == item_id,
        models.Item.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_public = False
    item.approval_status = "private"
    db.commit()
    return {"message": "Item is now private"}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@app.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    return {
        "total_users": db.query(models.User).count(),
        "total_items": db.query(models.Item).count(),
        "total_public_items": db.query(models.Item).filter(models.Item.is_public == True).count(),
        "pending_approvals": db.query(models.Item).filter(models.Item.approval_status == "pending").count(),
        "total_components": db.query(models.Component).count(),
        "vulnerable_components": db.query(models.Component).filter(models.Component.is_vulnerable == True).count(),
        "total_tracked": db.query(models.TrackedProduct).count(),
        "open_sbom_requests": db.query(models.SbomRequest).filter(models.SbomRequest.status == "open").count(),
    }


@app.get("/admin/users")
def admin_get_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    users = db.query(models.User).all()
    result = []
    for user in users:
        item_count = db.query(models.Item).filter(models.Item.user_id == user.id).count()
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
            "is_active": user.is_active,
            "total_items": item_count,
        })
    return result


@app.patch("/admin/users/{user_id}/role")
def admin_update_role(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = payload.get("role")
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Role must be user or admin")
    user.role = new_role
    db.commit()
    return {"message": f"Role updated to {new_role}"}


@app.patch("/admin/users/{user_id}/toggle-active")
def admin_toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"is_active": user.is_active}


@app.get("/admin/items")
def admin_get_all_items(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    items = db.query(models.Item).all()
    result = []
    for item in items:
        owner = db.query(models.User).filter(models.User.id == item.user_id).first()
        component_count = db.query(models.ItemComponent).filter(
            models.ItemComponent.item_id == item.id
        ).count()
        result.append({
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "category": item.category,
            "manufacturer": item.manufacturer,
            "is_public": item.is_public,
            "is_verified": item.is_verified,
            "is_featured": item.is_featured,
            "approval_status": item.approval_status,
            "upvotes": item.upvotes or 0,
            "component_count": component_count,
            "owner_username": owner.username if owner else "unknown",
            "created_at": item.created_at,
        })
    return result


@app.get("/admin/pending")
def admin_get_pending(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    items = db.query(models.Item).filter(
        models.Item.approval_status == "pending"
    ).all()
    result = []
    for item in items:
        owner = db.query(models.User).filter(models.User.id == item.user_id).first()
        component_count = db.query(models.ItemComponent).filter(
            models.ItemComponent.item_id == item.id
        ).count()
        result.append({
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "category": item.category,
            "manufacturer": item.manufacturer,
            "version": item.version,
            "description": item.description,
            "component_count": component_count,
            "owner_username": owner.username if owner else "unknown",
            "submitted_at": item.public_submitted_at,
        })
    return result


@app.post("/admin/items/{item_id}/approve")
def admin_approve_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_public = True
    item.approval_status = "approved"
    item.public_approved_at = datetime.utcnow()
    db.commit()
    log_action(db, admin.id, "approve_item", "item", item_id)
    return {"message": f"{item.name} approved"}


@app.post("/admin/items/{item_id}/reject")
def admin_reject_item(
    item_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.approval_status = "rejected"
    item.is_public = False
    item.rejection_note = payload.get("note", "")
    db.commit()
    return {"message": "Item rejected"}


@app.post("/admin/items/{item_id}/verify")
def admin_verify_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_verified = not item.is_verified
    db.commit()
    return {"is_verified": item.is_verified}


@app.post("/admin/items/{item_id}/feature")
def admin_feature_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_featured = not item.is_featured
    db.commit()
    return {"is_featured": item.is_featured}


@app.delete("/admin/items/{item_id}")
def admin_delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.query(models.ItemComponent).filter(
        models.ItemComponent.item_id == item_id
    ).delete()
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}


@app.post("/admin/components/{component_id}/flag-vulnerable")
def admin_flag_vulnerable(
    component_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    component = db.query(models.Component).filter(
        models.Component.id == component_id
    ).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    component.is_vulnerable = True
    component.vulnerability_note = payload.get("description")
    component.vulnerability_cve = payload.get("cve_id")
    db.commit()
    alert = models.VulnerabilityAlert(
        component_name=component.component_name,
        component_version=component.version,
        cve_id=payload.get("cve_id"),
        severity=payload.get("severity"),
        description=payload.get("description"),
        flagged_by=admin.id,
    )
    db.add(alert)
    db.commit()
    return {"message": f"{component.component_name} flagged as vulnerable"}


@app.get("/admin/audit-log")
def admin_audit_log(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    logs = db.query(models.AuditLog).order_by(
        models.AuditLog.created_at.desc()
    ).limit(200).all()
    result = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at,
            "username": user.username if user else "unknown",
        })
    return result


@app.get("/admin/vulnerable-components")
def admin_get_vulnerable(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    components = db.query(models.Component).filter(
        models.Component.is_vulnerable == True
    ).all()
    return [
        {
            "id": c.id,
            "component_name": c.component_name,
            "version": c.version,
            "vulnerability_note": c.vulnerability_note,
            "vulnerability_cve": c.vulnerability_cve,
        }
        for c in components
    ]


@app.post("/admin/seed-catalog")
def seed_catalog(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    from app.seed_real_data import seed_public_catalog
    count = seed_public_catalog(db, admin_user_id=admin.id)
    return {"message": f"Seeded {count} items to public catalog"}

# ---------------------------------------------------------------------------
# Live data fetcher from deps.dev
# ---------------------------------------------------------------------------

@app.post("/fetch-live-sbom")
def fetch_live_sbom(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import requests as req
    package_name = payload.get("name", "").strip()
    ecosystem = payload.get("ecosystem", "npm").lower()

    if not package_name:
        raise HTTPException(status_code=400, detail="Package name required")

    system_map = {"npm": "npm", "pypi": "pypi", "maven": "maven", "go": "go", "cargo": "cargo"}
    system = system_map.get(ecosystem, "npm")

    try:
        pkg_url = f"https://api.deps.dev/v3alpha/systems/{system}/packages/{package_name}"
        pkg_res = req.get(pkg_url, timeout=10)
        if pkg_res.status_code != 200:
            raise HTTPException(status_code=404, detail=f"Package '{package_name}' not found in {ecosystem}")

        pkg_data = pkg_res.json()
        versions = pkg_data.get("versions", [])
        latest_version = versions[-1].get("versionKey", {}).get("version", "unknown") if versions else "unknown"

        dep_url = f"https://api.deps.dev/v3alpha/systems/{system}/packages/{package_name}/versions/{latest_version}/dependencies"
        dep_res = req.get(dep_url, timeout=10)

        components_data = []
        if dep_res.status_code == 200:
            nodes = dep_res.json().get("nodes", [])
            for node in nodes[1:25]:
                vk = node.get("versionKey", {})
                components_data.append({
                    "name": vk.get("name", "unknown"),
                    "version": vk.get("version"),
                    "system": vk.get("system", system),
                })

        existing = db.query(models.Item).filter(
            models.Item.name == package_name,
            models.Item.source_format == "live_fetched",
            models.Item.user_id == current_user.id,
        ).first()
        if existing:
            return {
                "message": f"{package_name} already in your workspace",
                "item_id": existing.id,
                "item_name": existing.name,
                "components_found": len(components_data),
            }

        item = models.Item(
            user_id=current_user.id,
            name=package_name,
            item_type="application",
            category=f"{ecosystem.upper()} Package",
            manufacturer=ecosystem.upper(),
            developer=ecosystem.upper(),
            version=latest_version,
            source_format="live_fetched",
            source_name=f"deps.dev/{ecosystem}",
            description=f"{package_name} {latest_version} — live dependency data from deps.dev (Google)",
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        from app.importers import get_or_create_component, link_item_component
        for comp in components_data:
            component = get_or_create_component(
                db,
                comp_name=comp["name"],
                comp_version=comp["version"],
                comp_supplier=comp["system"],
                comp_license=None,
            )
            link_item_component(db, item.id, component.id)

        return {
            "message": f"Live SBOM fetched for {package_name}",
            "item_id": item.id,
            "item_name": item.name,
            "version": latest_version,
            "components_found": len(components_data),
            "ecosystem": ecosystem,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live data: {str(e)}")


# ---------------------------------------------------------------------------
# Startup - create first admin
# ---------------------------------------------------------------------------

@app.on_event("startup")
def create_first_admin():
    db = SessionLocal()
    try:
        admin_exists = db.query(models.User).filter(
            models.User.role == "admin"
        ).first()
        if not admin_exists:
            admin_username = os.getenv("ADMIN_USERNAME", "admin")
            admin_password = os.getenv("ADMIN_PASSWORD", "sbomadmin2024")
            admin_email = os.getenv("ADMIN_EMAIL", "admin@sbomfinder.com")
            existing = db.query(models.User).filter(
                models.User.username == admin_username
            ).first()
            if existing:
                existing.role = "admin"
                db.commit()
                print(f"Upgraded {admin_username} to admin role")
            else:
                admin_user = models.User(
                    username=admin_username,
                    email=admin_email,
                    hashed_password=hash_password(admin_password),
                    role="admin",
                )
                db.add(admin_user)
                db.commit()
                print(f"Admin created: {admin_username}")
    except Exception as e:
        print(f"Startup admin creation failed: {e}")
    finally:
        db.close()