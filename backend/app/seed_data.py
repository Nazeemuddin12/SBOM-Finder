from sqlalchemy.orm import Session

from app.models import Item, Component, ItemComponent


def seed_database(db: Session):
    existing_items = db.query(Item).count()
    if existing_items > 0:
        return

    item1 = Item(
        name="iPhone 15",
        item_type="device",
        category="Smartphone",
        manufacturer="Apple",
        developer="Apple",
        operating_system="iOS",
        description="Apple smartphone with SBOM components"
    )

    item2 = Item(
        name="Samsung Smart TV",
        item_type="device",
        category="Television",
        manufacturer="Samsung",
        developer="Samsung",
        operating_system="Tizen",
        description="Smart TV device with software components"
    )

    item3 = Item(
        name="Spotify App",
        item_type="application",
        category="Music Streaming",
        manufacturer="Spotify",
        developer="Spotify",
        operating_system="Cross-platform",
        description="Music streaming application"
    )

    item4 = Item(
        name="Zoom App",
        item_type="application",
        category="Communication",
        manufacturer="Zoom",
        developer="Zoom",
        operating_system="Cross-platform",
        description="Video communication application"
    )

    db.add_all([item1, item2, item3, item4])
    db.commit()

    comp1 = Component(
        component_name="OpenSSL",
        version="3.0.0",
        supplier="OpenSSL Software Foundation",
        license="Apache-2.0"
    )

    comp2 = Component(
        component_name="SQLite",
        version="3.42.0",
        supplier="SQLite Consortium",
        license="Public Domain"
    )

    comp3 = Component(
        component_name="zlib",
        version="1.2.13",
        supplier="zlib",
        license="zlib License"
    )

    comp4 = Component(
        component_name="WebRTC",
        version="M120",
        supplier="Google",
        license="BSD"
    )

    db.add_all([comp1, comp2, comp3, comp4])
    db.commit()

    db.refresh(item1)
    db.refresh(item2)
    db.refresh(item3)
    db.refresh(item4)

    db.refresh(comp1)
    db.refresh(comp2)
    db.refresh(comp3)
    db.refresh(comp4)

    links = [
        ItemComponent(item_id=item1.id, component_id=comp1.id),
        ItemComponent(item_id=item1.id, component_id=comp2.id),

        ItemComponent(item_id=item2.id, component_id=comp1.id),
        ItemComponent(item_id=item2.id, component_id=comp3.id),

        ItemComponent(item_id=item3.id, component_id=comp2.id),
        ItemComponent(item_id=item3.id, component_id=comp3.id),

        ItemComponent(item_id=item4.id, component_id=comp1.id),
        ItemComponent(item_id=item4.id, component_id=comp4.id),
    ]

    db.add_all(links)
    db.commit()