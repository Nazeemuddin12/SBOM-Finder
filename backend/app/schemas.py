# ============================================================
# schemas.py
# SBOM Finder — Pydantic Request / Response Models
# ============================================================
# FastAPI uses these classes for:
#   - Request validation  (body parsing + type coercion)
#   - Response serialisation (what JSON shape the API returns)
#   - Auto-generated OpenAPI docs at /docs
#
# Naming convention:
#   *Create   → inbound payload (POST body)
#   *Response → outbound shape  (what the client receives)
# ============================================================

from datetime import datetime
from pydantic import BaseModel


# ── Auth & Users ───────────────────────────────────────────────

class UserCreate(BaseModel):
    """POST /auth/register — all three fields are required."""
    username: str
    email: str
    password: str   # plain text; the route hashes it before storing


class UserResponse(BaseModel):
    """Public user profile — returned after login and in /admin/users."""
    id: int
    username: str
    email: str
    role: str = "user"                 # "user" | "admin"
    created_at: datetime | None = None
    is_active: bool = True

    class Config:
        from_attributes = True         # lets us pass an ORM instance directly


class LoginRequest(BaseModel):
    """POST /auth/login credentials."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Returned on successful login — JWT plus the user profile in one call."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse                 # avoids a second /me round-trip after login


# ── Items ──────────────────────────────────────────────────────

class ItemResponse(BaseModel):
    """Summary item card — used in list endpoints; no component breakdown."""
    id: int
    name: str
    item_type: str                     # "device" | "application"
    category: str | None = None
    manufacturer: str | None = None
    developer: str | None = None
    operating_system: str | None = None
    description: str | None = None
    owner: str | None = None
    version: str | None = None
    source_format: str | None = None   # cyclonedx | spdx | ai_discovered | …
    source_name: str | None = None
    is_public: bool = False
    is_verified: bool = False
    upvotes: int = 0
    approval_status: str = "private"   # private | pending | approved | rejected

    class Config:
        from_attributes = True


class ComponentResponse(BaseModel):
    """One software library/dependency as shown in the item detail view."""
    component_name: str
    version: str | None = None
    supplier: str | None = None
    license: str | None = None
    is_vulnerable: bool = False        # true when an admin has flagged a CVE
    vulnerability_cve: str | None = None  # e.g. "CVE-2021-44228"

    class Config:
        from_attributes = True


class ItemDetailResponse(BaseModel):
    """Full SBOM record — same as ItemResponse plus the component list.
    Used by GET /items/{id} and the public catalog detail endpoint."""
    id: int
    name: str
    item_type: str
    category: str | None = None
    manufacturer: str | None = None
    developer: str | None = None
    operating_system: str | None = None
    description: str | None = None
    owner: str | None = None
    version: str | None = None
    source_format: str | None = None
    source_name: str | None = None
    is_public: bool = False
    is_verified: bool = False
    approval_status: str = "private"
    components: list[ComponentResponse]  # full dependency list

    class Config:
        from_attributes = True


# ── Comparison ─────────────────────────────────────────────────

class CompareResponse(BaseModel):
    """Two-item comparison result — shared vs unique component names."""
    item_1: str
    item_2: str
    common_components: list[str]
    unique_to_item_1: list[str]
    unique_to_item_2: list[str]


class DetailedComparisonRow(BaseModel):
    """One row in a multi-item comparison table.
    item_details maps  item_name → {version, license, …}
    so the frontend can render a matrix without extra requests."""
    component_name: str
    category: str                      # "common" | "partial" | "unique"
    item_details: dict[str, dict[str, str | None]]


class AdvancedCompareResponse(BaseModel):
    """Full matrix result for comparing up to 4 items."""
    selected_items: list[str]
    comparison_rows: list[DetailedComparisonRow]


class MultiCompareResponse(BaseModel):
    """Simpler multi-item comparison — shared vs per-item unique components."""
    selected_items: list[str]
    common_components: list[str]
    unique_components: dict[str, list[str]]  # item_name → components only in that item


class ComparisonRow(BaseModel):
    """Single component row showing which items contain it."""
    component_name: str
    present_in: list[str]              # subset of selected_items
    category: str                      # "common" | "partial" | "unique"


# ── Reverse Lookup ─────────────────────────────────────────────

class ReverseLookupItemResponse(BaseModel):
    """Minimal item info returned by the reverse component search.
    Used to build the 'which products use openssl?' results list."""
    id: int
    name: str
    item_type: str
    manufacturer: str | None = None
    is_verified: bool = False

    class Config:
        from_attributes = True


# ── Stats ──────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    """Workspace-level aggregate counts shown on the Stats page."""
    total_items: int
    total_devices: int
    total_applications: int
    total_components: int
    total_tracked_products: int
    total_ai_discovered: int
    total_users: int

    class Config:
        from_attributes = True


# ── Tracked Products ───────────────────────────────────────────

class TrackedProductCreate(BaseModel):
    """POST /tracked-products — add a product to the user's watchlist."""
    name: str
    product_type: str | None = None
    vendor: str | None = None
    notes: str | None = None


class TrackedProductResponse(BaseModel):
    """Tracked product with its current SBOM discovery status."""
    id: int
    name: str
    product_type: str | None = None
    vendor: str | None = None
    status: str | None = None         # pending | partial | complete
    notes: str | None = None
    created_at: datetime | None = None
    last_checked: datetime | None = None

    class Config:
        from_attributes = True


# ── External Search ────────────────────────────────────────────

class ExternalSearchResult(BaseModel):
    """One hit from an external registry search (npm/PyPI/GitHub/Maven/…)."""
    name: str | None = None
    full_name: str | None = None       # e.g. "owner/repo" for GitHub results
    url: str | None = None
    description: str | None = None
    owner: str | None = None
    stars: int | None = None           # or popularity proxy for non-GitHub sources
    source: str | None = None          # "npm" | "PyPI" | "GitHub" | "Maven Central" | …


class SearchWithExternalResponse(BaseModel):
    """Combined smart-search result — local DB hits + external registry fallback."""
    local_results: list[ItemResponse]
    external_results: list[ExternalSearchResult]


class ExternalItemCreate(BaseModel):
    """Import an external search result into the user's workspace."""
    name: str
    full_name: str | None = None
    url: str | None = None
    description: str | None = None
    owner: str | None = None
    stars: int | None = None
    source: str | None = None
    item_type: str | None = "application"


# ── Vulnerability Alerts ───────────────────────────────────────

class VulnerabilityAlertCreate(BaseModel):
    """Admin payload for flagging a component with a known vulnerability."""
    component_name: str
    component_version: str | None = None
    cve_id: str | None = None          # e.g. "CVE-2021-44228"
    severity: str | None = None        # low | medium | high | critical
    description: str | None = None


# ── SBOM Requests ──────────────────────────────────────────────

class SbomRequestCreate(BaseModel):
    """Submit a community request for an SBOM that doesn't exist yet."""
    product_name: str
    description: str | None = None


class SbomRequestResponse(BaseModel):
    """Public SBOM request as returned by the API — includes upvote count."""
    id: int
    product_name: str
    description: str | None = None
    status: str                        # open | fulfilled | closed
    upvotes: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True