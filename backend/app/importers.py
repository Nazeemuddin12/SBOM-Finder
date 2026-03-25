from app.models import Item, Component, ItemComponent


def import_cyclonedx_json(data: dict, db):
    metadata = data.get("metadata", {})
    component_meta = metadata.get("component", {})

    item_name = component_meta.get("name", "Unknown CycloneDX Item")
    item_version = component_meta.get("version")
    item_supplier = None

    supplier_data = component_meta.get("supplier")
    if isinstance(supplier_data, dict):
        item_supplier = supplier_data.get("name")
    elif isinstance(supplier_data, str):
        item_supplier = supplier_data

    # Prevent duplicate imported items
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
        name=item_name,
        item_type="application",
        category="Imported SBOM",
        manufacturer=item_supplier,
        developer=item_supplier,
        operating_system=None,
        description="Imported from CycloneDX SBOM",
        owner=item_supplier,
        version=item_version,
        source_format="cyclonedx",
        source_name=item_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    components = data.get("components", [])
    for comp in components:
        comp_name = comp.get("name")
        if not comp_name:
            continue

        comp_version = comp.get("version")
        comp_supplier = None

        supplier_data = comp.get("supplier")
        if isinstance(supplier_data, dict):
            comp_supplier = supplier_data.get("name")
        elif isinstance(supplier_data, str):
            comp_supplier = supplier_data

        comp_license = None
        licenses = comp.get("licenses", [])
        if licenses and isinstance(licenses, list):
            first_license = licenses[0]
            if isinstance(first_license, dict):
                license_obj = first_license.get("license", {})
                if isinstance(license_obj, dict):
                    comp_license = license_obj.get("id") or license_obj.get("name")

        existing_component = (
            db.query(Component)
            .filter(
                Component.component_name == comp_name,
                Component.version == comp_version,
            )
            .first()
        )

        if existing_component:
            component_record = existing_component
        else:
            component_record = Component(
                component_name=comp_name,
                version=comp_version,
                supplier=comp_supplier,
                license=comp_license,
            )
            db.add(component_record)
            db.commit()
            db.refresh(component_record)

        link_exists = (
            db.query(ItemComponent)
            .filter(
                ItemComponent.item_id == item.id,
                ItemComponent.component_id == component_record.id,
            )
            .first()
        )

        if not link_exists:
            db.add(
                ItemComponent(
                    item_id=item.id,
                    component_id=component_record.id,
                )
            )
            db.commit()

    return item


def import_spdx_json(data: dict, db):
    item_name = data.get("name", "Unknown SPDX Item")
    item_version = data.get("versionInfo")
    item_supplier = data.get("supplier")

    if isinstance(item_supplier, dict):
        item_supplier = item_supplier.get("name")
    elif isinstance(item_supplier, str):
        item_supplier = item_supplier

    # Prevent duplicate imported items
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
        name=item_name,
        item_type="application",
        category="Imported SBOM",
        manufacturer=item_supplier,
        developer=item_supplier,
        operating_system=None,
        description="Imported from SPDX SBOM",
        owner=item_supplier,
        version=item_version,
        source_format="spdx",
        source_name=item_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    packages = data.get("packages", [])
    for pkg in packages:
        comp_name = pkg.get("name")
        if not comp_name:
            continue

        comp_version = pkg.get("versionInfo")
        comp_supplier = pkg.get("supplier")
        comp_license = pkg.get("licenseConcluded") or pkg.get("licenseDeclared")

        if isinstance(comp_supplier, dict):
            comp_supplier = comp_supplier.get("name")
        elif isinstance(comp_supplier, str):
            comp_supplier = comp_supplier

        existing_component = (
            db.query(Component)
            .filter(
                Component.component_name == comp_name,
                Component.version == comp_version,
            )
            .first()
        )

        if existing_component:
            component_record = existing_component
        else:
            component_record = Component(
                component_name=comp_name,
                version=comp_version,
                supplier=comp_supplier,
                license=comp_license,
            )
            db.add(component_record)
            db.commit()
            db.refresh(component_record)

        link_exists = (
            db.query(ItemComponent)
            .filter(
                ItemComponent.item_id == item.id,
                ItemComponent.component_id == component_record.id,
            )
            .first()
        )

        if not link_exists:
            db.add(
                ItemComponent(
                    item_id=item.id,
                    component_id=component_record.id,
                )
            )
            db.commit()

    return item