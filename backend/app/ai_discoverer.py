import anthropic
import json
import requests
import os


def fetch_package_context(query: str) -> dict:
    context = {"query": query, "sources": []}

    # npm
    try:
        r = requests.get(f"https://registry.npmjs.org/{query}", timeout=6)
        if r.status_code == 200:
            d = r.json()
            latest = d.get("dist-tags", {}).get("latest", "")
            version_data = d.get("versions", {}).get(latest, {})
            context["sources"].append({
                "registry": "npm",
                "name": d.get("name"),
                "version": latest,
                "description": d.get("description"),
                "license": version_data.get("license"),
                "dependencies": list((version_data.get("dependencies") or {}).keys())[:20],
            })
    except Exception:
        pass

    # PyPI
    try:
        r = requests.get(f"https://pypi.org/pypi/{query}/json", timeout=6)
        if r.status_code == 200:
            info = r.json().get("info", {})
            context["sources"].append({
                "registry": "PyPI",
                "name": info.get("name"),
                "version": info.get("version"),
                "description": info.get("summary"),
                "license": info.get("license"),
                "requires": info.get("requires_dist") or [],
            })
    except Exception:
        pass

    # GitHub
    try:
        r = requests.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "sort": "stars", "per_page": 1},
            headers={"Accept": "application/vnd.github+json"},
            timeout=6,
        )
        if r.status_code == 200:
            items = r.json().get("items", [])
            if items:
                top = items[0]
                context["sources"].append({
                    "registry": "GitHub",
                    "name": top.get("full_name"),
                    "description": top.get("description"),
                    "language": top.get("language"),
                    "stars": top.get("stargazers_count"),
                    "license": top.get("license", {}).get("spdx_id") if top.get("license") else None,
                    "topics": top.get("topics", []),
                })
    except Exception:
        pass

    # Maven
    try:
        r = requests.get(
            "https://search.maven.org/solrsearch/select",
            params={"q": query, "rows": 1, "wt": "json"},
            timeout=6,
        )
        if r.status_code == 200:
            docs = r.json().get("response", {}).get("docs", [])
            if docs:
                doc = docs[0]
                context["sources"].append({
                    "registry": "Maven",
                    "name": f"{doc.get('g')}:{doc.get('a')}",
                    "version": doc.get("latestVersion"),
                    "group_id": doc.get("g"),
                    "artifact_id": doc.get("a"),
                })
    except Exception:
        pass

    return context


def is_hardware_device(query: str) -> bool:
    device_keywords = [
        "raspberry pi", "arduino", "cisco", "router", "camera",
        "firmware", "iot", "smart", "sensor", "gateway", "switch",
        "firewall", "printer", "scanner", "tv", "watch", "iphone",
        "android", "pixel", "samsung", "ring", "nest", "tesla",
        "esp32", "esp8266", "stm32", "microcontroller", "router",
        "access point", "nas", "synology", "qnap", "netgear",
    ]
    query_lower = query.lower()
    return any(k in query_lower for k in device_keywords)


def discover_sbom_with_ai(query: str, api_key: str = None) -> dict:
    if is_hardware_device(query):
        context = {"query": query, "type": "hardware_device", "sources": []}
        # also try GitHub firmware repos
        try:
            r = requests.get(
                "https://api.github.com/search/repositories",
                params={"q": f"{query} firmware", "sort": "stars", "per_page": 3},
                headers={"Accept": "application/vnd.github+json"},
                timeout=6,
            )
            if r.status_code == 200:
                for item in r.json().get("items", []):
                    context["sources"].append({
                        "registry": "GitHub Firmware",
                        "name": item.get("full_name"),
                        "description": item.get("description"),
                        "language": item.get("language"),
                        "topics": item.get("topics", []),
                        "license": item.get("license", {}).get("spdx_id") if item.get("license") else None,
                    })
        except Exception:
            pass
    else:
        context = fetch_package_context(query)

    context_str = json.dumps(context, indent=2)

    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=key)

    prompt = f"""You are an expert SBOM analyst with deep knowledge of software packages, 
hardware devices, firmware, and embedded systems.

User wants SBOM for: "{query}"

Real metadata from registries:
{context_str}

Determine if this is SOFTWARE or HARDWARE DEVICE:

For SOFTWARE: list all direct and transitive dependencies.
For HARDWARE DEVICE (router, camera, Raspberry Pi, IoT, smartphone, etc.):
  List ALL software components including:
  - Operating system / kernel
  - Bootloader (u-boot, grub, etc.)
  - Network stack libraries
  - Security libraries (OpenSSL, mbedTLS, wolfSSL)
  - System utilities (busybox, curl, wget, openntpd)
  - Runtime environments (Python, Java, Node if applicable)
  - Device drivers as software components
  - Management interfaces (web UI framework, SNMP, SSH)
  - Bundled applications
  - Package managers used

Return ONLY valid JSON, no markdown, no extra text:
{{
  "name": "exact product/package name",
  "version": "latest stable version or firmware version",
  "item_type": "application or device",
  "category": "specific category e.g. Web Server, Single Board Computer, IP Camera, Home Router",
  "manufacturer": "company or organization",
  "developer": "primary developer or maintainer",
  "description": "clear 1-2 sentence description of what this is",
  "license": "primary SPDX license e.g. MIT, Apache-2.0, GPL-2.0, Proprietary",
  "homepage": "official URL",
  "components": [
    {{
      "component_name": "exact name",
      "version": "version string or null",
      "supplier": "supplier or vendor or null",
      "license": "SPDX license or null",
      "component_type": "os-kernel/bootloader/library/firmware/runtime/utility/driver/application",
      "purpose": "one sentence: what this does"
    }}
  ]
}}

Rules:
- Hardware devices: minimum 15-25 real components
- Software packages: minimum 8-15 real dependencies
- Use real known versions
- Use real SPDX license identifiers
- Be accurate and specific — use your full knowledge
"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def save_discovered_sbom(data: dict, db, user_id: int):
    from app.models import Item
    from app.importers import get_or_create_component, link_item_component

    existing = db.query(Item).filter(
        Item.name == data["name"],
        Item.source_format == "ai_discovered",
        Item.user_id == user_id,
    ).first()

    if existing:
        return existing

    item = Item(
        user_id=user_id,
        name=data["name"],
        item_type=data.get("item_type", "application"),
        category=data.get("category", "Software Application"),
        manufacturer=data.get("manufacturer"),
        developer=data.get("developer"),
        operating_system=None,
        description=data.get("description"),
        owner=data.get("manufacturer"),
        version=data.get("version"),
        source_format="ai_discovered",
        source_name=data["name"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    for comp in data.get("components", []):
        comp_name = comp.get("component_name")
        if not comp_name:
            continue
        component_record = get_or_create_component(
            db,
            comp_name=comp_name,
            comp_version=comp.get("version"),
            comp_supplier=comp.get("supplier"),
            comp_license=comp.get("license"),
        )
        link_item_component(db, item.id, component_record.id)

    return item