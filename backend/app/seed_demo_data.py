from datetime import datetime

from app.database import SessionLocal, engine, Base
from app.models import Item, Component, ItemComponent, TrackedProduct, SourceRecord


Base.metadata.create_all(bind=engine)


demo_items = [
    {
        "name": "Spotify Desktop",
        "item_type": "application",
        "category": "Media & Streaming",
        "manufacturer": "Spotify",
        "developer": "Spotify",
        "operating_system": "Windows / macOS",
        "description": "Desktop streaming application for music and podcasts.",
        "version": "1.2.0",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("zlib", "1.2.13", "zlib", "Zlib"),
            ("curl", "8.0.1", "curl", "curl"),
            ("sqlite", "3.43.0", "SQLite", "Public Domain"),
        ],
    },
    {
        "name": "Postman",
        "item_type": "application",
        "category": "Developer Tools",
        "manufacturer": "Postman",
        "developer": "Postman",
        "operating_system": "Windows / macOS / Linux",
        "description": "API development and testing platform.",
        "version": "11.0",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("zlib", "1.2.13", "zlib", "Zlib"),
            ("electron", "28.0.0", "Electron", "MIT"),
            ("protobuf", "24.0", "Google", "BSD-3-Clause"),
        ],
    },
    {
        "name": "Visual Studio Code",
        "item_type": "application",
        "category": "Developer Tools",
        "manufacturer": "Microsoft",
        "developer": "Microsoft",
        "operating_system": "Windows / macOS / Linux",
        "description": "Source code editor with extension support.",
        "version": "1.87",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("electron", "28.0.0", "Electron", "MIT"),
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("ripgrep", "14.0", "BurntSushi", "MIT"),
            ("node.js", "20.0", "OpenJS Foundation", "MIT"),
        ],
    },
    {
        "name": "Docker Desktop",
        "item_type": "application",
        "category": "Developer Tools",
        "manufacturer": "Docker",
        "developer": "Docker",
        "operating_system": "Windows / macOS",
        "description": "Container development environment.",
        "version": "4.28",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("containerd", "1.7", "CNCF", "Apache-2.0"),
            ("runc", "1.1", "Open Containers", "Apache-2.0"),
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("protobuf", "24.0", "Google", "BSD-3-Clause"),
        ],
    },
    {
        "name": "Smart Camera Firmware",
        "item_type": "device",
        "category": "Smart Device",
        "manufacturer": "SecureCam",
        "developer": "SecureCam",
        "operating_system": "Embedded Linux",
        "description": "Firmware stack for a connected smart security camera.",
        "version": "2.4.1",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("busybox", "1.36", "BusyBox", "GPL-2.0"),
            ("curl", "8.0.1", "curl", "curl"),
            ("libxml2", "2.11", "GNOME", "MIT"),
        ],
    },
    {
        "name": "Router Management Console",
        "item_type": "device",
        "category": "Networking Device",
        "manufacturer": "NetWave",
        "developer": "NetWave",
        "operating_system": "Embedded Linux",
        "description": "Software stack for router administration and monitoring.",
        "version": "5.2.3",
        "source_format": "seed",
        "source_name": "demo_seed",
        "components": [
            ("openssl", "3.0.0", "OpenSSL", "Apache-2.0"),
            ("busybox", "1.36", "BusyBox", "GPL-2.0"),
            ("zlib", "1.2.13", "zlib", "Zlib"),
            ("nginx", "1.25", "F5", "BSD-2-Clause"),
        ],
    },
]


demo_tracked_products = [
    {
        "name": "grafana/grafana",
        "product_type": "application",
        "vendor": "grafana",
        "status": "partial",
        "notes": "Tracked from external GitHub suggestion: https://github.com/grafana/grafana",
        "created_at": datetime.utcnow(),
        "sources": [
            {
                "source_type": "github",
                "source_title": "grafana/grafana",
                "source_url": "https://github.com/grafana/grafana",
                "fetch_status": "success",
                "confidence": "0.70",
            }
        ],
    },
    {
        "name": "kubernetes/kubernetes",
        "product_type": "application",
        "vendor": "kubernetes",
        "status": "partial",
        "notes": "Tracked from external GitHub suggestion: https://github.com/kubernetes/kubernetes",
        "created_at": datetime.utcnow(),
        "sources": [
            {
                "source_type": "github",
                "source_title": "kubernetes/kubernetes",
                "source_url": "https://github.com/kubernetes/kubernetes",
                "fetch_status": "success",
                "confidence": "0.70",
            }
        ],
    },
]


def get_or_create_component(db, name, version, supplier, license_name):
    existing = (
        db.query(Component)
        .filter(Component.component_name == name, Component.version == version)
        .first()
    )
    if existing:
        return existing

    component = Component(
        component_name=name,
        version=version,
        supplier=supplier,
        license=license_name,
    )
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


def link_item_component(db, item_id, component_id):
    existing = (
        db.query(ItemComponent)
        .filter(
            ItemComponent.item_id == item_id,
            ItemComponent.component_id == component_id,
        )
        .first()
    )
    if not existing:
        db.add(ItemComponent(item_id=item_id, component_id=component_id))
        db.commit()


def seed_items(db):
    for item_data in demo_items:
        existing_item = (
            db.query(Item)
            .filter(Item.name == item_data["name"], Item.source_format == "seed")
            .first()
        )

        if existing_item:
            item = existing_item
        else:
            item = Item(
                name=item_data["name"],
                item_type=item_data["item_type"],
                category=item_data["category"],
                manufacturer=item_data["manufacturer"],
                developer=item_data["developer"],
                operating_system=item_data["operating_system"],
                description=item_data["description"],
                owner=item_data["manufacturer"],
                version=item_data["version"],
                source_format=item_data["source_format"],
                source_name=item_data["source_name"],
            )
            db.add(item)
            db.commit()
            db.refresh(item)

        for comp_name, comp_version, comp_supplier, comp_license in item_data["components"]:
            component = get_or_create_component(
                db, comp_name, comp_version, comp_supplier, comp_license
            )
            link_item_component(db, item.id, component.id)


def seed_tracked_products(db):
    for tracked_data in demo_tracked_products:
        existing_tracked = (
            db.query(TrackedProduct)
            .filter(TrackedProduct.name == tracked_data["name"])
            .first()
        )

        if existing_tracked:
            tracked_product = existing_tracked
        else:
            tracked_product = TrackedProduct(
                name=tracked_data["name"],
                product_type=tracked_data["product_type"],
                vendor=tracked_data["vendor"],
                status=tracked_data["status"],
                notes=tracked_data["notes"],
                created_at=tracked_data["created_at"],
            )
            db.add(tracked_product)
            db.commit()
            db.refresh(tracked_product)

        for source_data in tracked_data["sources"]:
            existing_source = (
                db.query(SourceRecord)
                .filter(
                    SourceRecord.tracked_product_id == tracked_product.id,
                    SourceRecord.source_url == source_data["source_url"],
                )
                .first()
            )

            if not existing_source:
                source = SourceRecord(
                    tracked_product_id=tracked_product.id,
                    source_type=source_data["source_type"],
                    source_title=source_data["source_title"],
                    source_url=source_data["source_url"],
                    fetch_status=source_data["fetch_status"],
                    confidence=source_data["confidence"],
                    last_fetched=datetime.utcnow(),
                )
                db.add(source)
                db.commit()


def seed():
    db = SessionLocal()
    try:
        seed_items(db)
        seed_tracked_products(db)
        print("Demo items and tracked products seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()