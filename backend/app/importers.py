from app.models import Item, Component, ItemComponent


def guess_item_type(name: str, category: str | None = None):
    # Scans name and category for hardware keywords — defaults to "application" if none match
    text = f"{name or ''} {category or ''}".lower()

    device_keywords = [
        "router", "camera", "printer", "firmware", "sensor", "iot",
        "switch", "gateway", "device", "appliance", "scanner",
        "smart tv", "watch", "speaker",
    ]

    for keyword in device_keywords:
        if keyword in text:
            return "device"

    return "application"


def guess_category(name: str):
    # Maps known product names to a readable category label — falls back to "Software Application"
    text = (name or "").lower()

    mapping = {
        "spotify": "Media & Streaming",
        "postman": "Developer Tools",
        "vscode": "Developer Tools",
        "visual studio code": "Developer Tools",
        "docker": "Developer Tools",
        "camera": "Smart Device",
        "router": "Networking Device",
        "printer": "Office Device",
        "firmware": "Firmware",
        "gateway": "Networking Device",
    }

    for key, value in mapping.items():
        if key in text:
            return value

    return "Software Application"


def normalize_supplier(value):
    # Supplier can come in as a plain string or a dict like {"name": "Acme"}
    # This handles both cases and returns just the name string
    if isinstance(value, dict):
        return value.get("name")
    if isinstance(value, str):
        return value
    return None


def extract_cyclonedx_license(comp: dict):
    # CycloneDX nests license info deeply: comp.licenses[0].license.id
    # We prefer the SPDX id (e.g. "MIT") but fall back to the display name
    licenses = comp.get("licenses", [])
    if licenses and isinstance(licenses, list):
        first_license = licenses[0]
        if isinstance(first_license, dict):
            license_obj = first_license.get("license", {})
            if isinstance(license_obj, dict):
                return license_obj.get("id") or license_obj.get("name")
    return None


def get_or_create_component(db, comp_name, comp_version=None, comp_supplier=None, comp_license=None):
    # Reuse existing component rows instead of creating duplicates.
    # Two products using "openssl 3.1.0" should point to the same row.
    existing_component = (
        db.query(Component)
        .filter(
            Component.component_name == comp_name,
            Component.version == comp_version,
        )
        .first()
    )

    if existing_component:
        return existing_component

    # No match found — create a new component row
    component_record = Component(
        component_name=comp_name,
        version=comp_version,
        supplier=comp_supplier,
        license=comp_license,
    )
    db.add(component_record)
    db.commit()
    db.refresh(component_record)
    return component_record


def link_item_component(db, item_id, component_id):
    # Creates the many-to-many join row between an item and a component.
    # Checks first so we never create duplicate links.
    link_exists = (
        db.query(ItemComponent)
        .filter(
            ItemComponent.item_id == item_id,
            ItemComponent.component_id == component_id,
        )
        .first()
    )

    if not link_exists:
        db.add(ItemComponent(item_id=item_id, component_id=component_id))
        db.commit()


def import_cyclonedx_json(data, db, user_id=None):
    # CycloneDX structure: metadata.component holds the top-level product info,
    # and components[] holds the list of dependencies.
    metadata = data.get("metadata", {})
    component_meta = metadata.get("component", {})

    item_name = component_meta.get("name", "Unknown CycloneDX Item")
    item_version = component_meta.get("version")
    item_supplier = normalize_supplier(component_meta.get("supplier"))
    item_description = component_meta.get("description") or f"Imported from CycloneDX SBOM for {item_name}"
    item_type = guess_item_type(item_name, component_meta.get("type"))
    item_category = guess_category(item_name)

    # Avoid creating duplicates if the same file is uploaded more than once
    existing_item = (
        db.query(Item)
        .filter(
            Item.name == item_name,
            Item.version == item_version,
            Item.source_format == "cyclonedx",
        )
        .first()
    )

    if existing_item:
        return existing_item

    item = Item(
        user_id=user_id,
        name=item_name,
        item_type=item_type,
        category=item_category,
        manufacturer=item_supplier,
        developer=item_supplier,
        operating_system=None,
        description=item_description,
        owner=item_supplier,
        version=item_version,
        source_format="cyclonedx",
        source_name=item_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Loop through every component in the SBOM and link it to this item
    components = data.get("components", [])
    for comp in components:
        comp_name = comp.get("name")
        if not comp_name:
            continue  # skip components with no name — they can't be identified

        comp_version = comp.get("version")
        comp_supplier = normalize_supplier(comp.get("supplier"))
        comp_license = extract_cyclonedx_license(comp)

        component_record = get_or_create_component(
            db,
            comp_name=comp_name,
            comp_version=comp_version,
            comp_supplier=comp_supplier,
            comp_license=comp_license,
        )

        link_item_component(db, item.id, component_record.id)

    return item


def import_spdx_json(data, db, user_id=None):
    # SPDX uses different field names than CycloneDX:
    #   "versionInfo" instead of "version"
    #   "packages" instead of "components"
    #   "licenseConcluded" instead of nested licenses object
    #   "documentComment" instead of "description"
    item_name = data.get("name", "Unknown SPDX Item")
    item_version = data.get("versionInfo")
    item_supplier = normalize_supplier(data.get("supplier"))
    item_description = data.get("documentComment") or f"Imported from SPDX SBOM for {item_name}"
    item_type = guess_item_type(item_name)
    item_category = guess_category(item_name)

    # Same dedup check as CycloneDX — don't re-import the same file
    existing_item = (
        db.query(Item)
        .filter(
            Item.name == item_name,
            Item.version == item_version,
            Item.source_format == "spdx",
        )
        .first()
    )

    if existing_item:
        return existing_item

    item = Item(
        user_id=user_id,
        name=item_name,
        item_type=item_type,
        category=item_category,
        manufacturer=item_supplier,
        developer=item_supplier,
        operating_system=None,
        description=item_description,
        owner=item_supplier,
        version=item_version,
        source_format="spdx",
        source_name=item_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # SPDX calls them "packages" — process each one the same way as CycloneDX components
    packages = data.get("packages", [])
    for pkg in packages:
        comp_name = pkg.get("name")
        if not comp_name:
            continue

        comp_version = pkg.get("versionInfo")
        comp_supplier = normalize_supplier(pkg.get("supplier"))
        # Prefer the concluded license over the declared one
        comp_license = pkg.get("licenseConcluded") or pkg.get("licenseDeclared")

        component_record = get_or_create_component(
            db,
            comp_name=comp_name,
            comp_version=comp_version,
            comp_supplier=comp_supplier,
            comp_license=comp_license,
        )

        link_item_component(db, item.id, component_record.id)

    return item