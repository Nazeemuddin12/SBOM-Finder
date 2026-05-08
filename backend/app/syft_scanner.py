import subprocess
import json
import os
import shutil as sh


def get_syft_path():
    # Try to find the syft binary in PATH first, then fall back to known install
    # locations used by Render and other deployment platforms.
    path = sh.which("syft") or sh.which("anchore_syft")
    if path:
        return path

    # Hardcoded fallback paths — Render installs syft here when using pip
    for p in ["/usr/local/bin/syft", "/opt/render/project/src/.venv/bin/syft"]:
        if os.path.exists(p):
            return p

    return None  # syft is not available on this server


def is_syft_available():
    # Checks whether syft is installed and actually executable.
    # Called by the frontend on page load to show/hide the Generate feature.
    syft = get_syft_path()
    if not syft:
        return False
    try:
        result = subprocess.run(
            [syft, "version"],
            capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except Exception:
        return False


def detect_file_type(filename: str) -> str:
    # Maps the uploaded filename to a human-readable type label.
    # Used only for display purposes in the item category — does not affect scanning.
    name = filename.lower()

    if name.endswith((".jar", ".war", ".ear", ".aar")):
        return "java-archive"
    if name.endswith((".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz")):
        return "archive"
    if name.endswith(".apk"):
        return "android-apk"
    if name.endswith((".exe", ".dll", ".so", ".dylib")):
        return "binary"

    # Package manifest files — Syft reads these to find declared dependencies
    if name in ("package.json", "package-lock.json", "yarn.lock"):
        return "npm"
    if name in ("requirements.txt", "pipfile.lock", "pipfile", "setup.py", "pyproject.toml", "poetry.lock"):
        return "python"
    if name in ("pom.xml", "build.gradle", "build.gradle.kts"):
        return "java"
    if name in ("go.mod", "go.sum"):
        return "go"
    if name in ("gemfile.lock", "gemfile"):
        return "ruby"
    if name in ("composer.json", "composer.lock"):
        return "php"
    if name in ("cargo.toml", "cargo.lock"):
        return "rust"

    return "unknown"


def scan_with_syft(file_path: str, timeout: int = 120) -> dict:
    # Runs syft as a subprocess against the uploaded file and returns the
    # parsed CycloneDX JSON output as a Python dict.
    #
    # timeout=120 gives syft up to 2 minutes — large JARs or ZIPs can be slow.
    # --quiet suppresses progress output so only the JSON result goes to stdout.
    syft = get_syft_path()
    if not syft:
        raise Exception("Syft is not installed on this server")

    result = subprocess.run(
        [syft, "scan", file_path, "-o", "cyclonedx-json", "--quiet"],
        capture_output=True,
        text=True,
        timeout=timeout,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise Exception(f"Syft scan failed: {stderr or 'unknown error'}")

    if not result.stdout.strip():
        raise Exception("Syft returned no output — file may not contain scannable components")

    return json.loads(result.stdout)


def parse_syft_output(data: dict, display_name: str) -> dict:
    # Converts the raw CycloneDX JSON from Syft into a clean dict that
    # main.py can use to create an Item and its Component records.
    metadata = data.get("metadata", {})
    component_meta = metadata.get("component", {})

    # Prefer the display_name passed in (derived from the filename) over
    # whatever Syft put in the metadata — it's more readable for the user
    name = (
        display_name
        or component_meta.get("name")
        or "Scanned Application"
    )
    version = component_meta.get("version")

    # Syft sets the component type to "firmware" or "operating-system" for
    # system-level scans — everything else is treated as an application
    comp_type = component_meta.get("type", "").lower()
    item_type = "device" if comp_type in ("firmware", "device", "operating-system") else "application"

    components = []
    for comp in data.get("components", []):
        comp_name = comp.get("name")
        if not comp_name:
            continue  # skip anonymous components

        # Extract the first available license from the nested licenses array
        license_str = None
        for lic_entry in comp.get("licenses", []):
            if isinstance(lic_entry, dict):
                lic = lic_entry.get("license", {})
                license_str = lic.get("id") or lic.get("name")
                if license_str:
                    break  # stop at the first valid license found

        # Supplier can come from either "supplier.name" or the flat "publisher" field
        supplier = None
        if comp.get("supplier") and isinstance(comp["supplier"], dict):
            supplier = comp["supplier"].get("name")
        elif comp.get("publisher"):
            supplier = comp["publisher"]

        components.append({
            "component_name": comp_name,
            "version": comp.get("version"),
            "supplier": supplier,
            "license": license_str,
        })

    return {
        "name": name,
        "version": version,
        "item_type": item_type,
        "components": components,
        "total": len(components),  # used in the API response to show how many components were found
    }