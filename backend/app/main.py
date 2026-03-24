from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, SessionLocal, engine
from app import models
from app.seed_data import seed_database
from app.schemas import (
    ItemResponse,
    ItemDetailResponse,
    CompareResponse,
    ReverseLookupItemResponse,
    StatsResponse,
)


Base.metadata.create_all(bind=engine)

app = FastAPI()
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


@app.on_event("startup")
def startup_event():
    db: Session = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


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
        return {"error": "Item not found"}

    component_list = []
    for link in item.components:
        comp = link.component
        component_list.append({
            "component_name": comp.component_name,
            "version": comp.version,
            "supplier": comp.supplier,
            "license": comp.license
        })

    return {
        "id": item.id,
        "name": item.name,
        "item_type": item.item_type,
        "category": item.category,
        "manufacturer": item.manufacturer,
        "developer": item.developer,
        "operating_system": item.operating_system,
        "description": item.description,
        "components": component_list
    }

@app.get("/search", response_model=list[ItemResponse])
def search_items(
    name: str | None = None,
    item_type: str | None = None,
    manufacturer: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)

    if name:
        query = query.filter(models.Item.name.ilike(f"%{name}%"))

    if item_type:
        query = query.filter(models.Item.item_type.ilike(f"%{item_type}%"))

    if manufacturer:
        query = query.filter(models.Item.manufacturer.ilike(f"%{manufacturer}%"))

    return query.all()

@app.get("/compare", response_model=CompareResponse)
def compare_items(item1: int, item2: int, db: Session = Depends(get_db)):
    first_item = db.query(models.Item).filter(models.Item.id == item1).first()
    second_item = db.query(models.Item).filter(models.Item.id == item2).first()

    if not first_item or not second_item:
        return {"error": "One or both items not found"}

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

@app.get("/components/{component_name}", response_model=list[ReverseLookupItemResponse])
def reverse_lookup(component_name: str, db: Session = Depends(get_db)):
    component = (
        db.query(models.Component)
        .filter(models.Component.component_name.ilike(component_name))
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

    return {
        "total_items": total_items,
        "total_devices": total_devices,
        "total_applications": total_applications,
        "total_components": total_components,
    }