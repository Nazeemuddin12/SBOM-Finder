from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str = "user"
    created_at: datetime | None = None
    is_active: bool = True

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ItemResponse(BaseModel):
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
    upvotes: int = 0
    approval_status: str = "private"

    class Config:
        from_attributes = True


class ComponentResponse(BaseModel):
    component_name: str
    version: str | None = None
    supplier: str | None = None
    license: str | None = None
    is_vulnerable: bool = False
    vulnerability_cve: str | None = None

    class Config:
        from_attributes = True


class ItemDetailResponse(BaseModel):
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
    components: list[ComponentResponse]

    class Config:
        from_attributes = True


class CompareResponse(BaseModel):
    item_1: str
    item_2: str
    common_components: list[str]
    unique_to_item_1: list[str]
    unique_to_item_2: list[str]


class ReverseLookupItemResponse(BaseModel):
    id: int
    name: str
    item_type: str
    manufacturer: str | None = None
    is_verified: bool = False

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_items: int
    total_devices: int
    total_applications: int
    total_components: int
    total_tracked_products: int
    total_ai_discovered: int
    total_users: int

    class Config:
        from_attributes = True


class DetailedComparisonRow(BaseModel):
    component_name: str
    category: str
    item_details: dict[str, dict[str, str | None]]


class AdvancedCompareResponse(BaseModel):
    selected_items: list[str]
    comparison_rows: list[DetailedComparisonRow]


class TrackedProductCreate(BaseModel):
    name: str
    product_type: str | None = None
    vendor: str | None = None
    notes: str | None = None


class TrackedProductResponse(BaseModel):
    id: int
    name: str
    product_type: str | None = None
    vendor: str | None = None
    status: str | None = None
    notes: str | None = None
    created_at: datetime | None = None
    last_checked: datetime | None = None

    class Config:
        from_attributes = True


class ExternalSearchResult(BaseModel):
    name: str | None = None
    full_name: str | None = None
    url: str | None = None
    description: str | None = None
    owner: str | None = None
    stars: int | None = None
    source: str | None = None


class SearchWithExternalResponse(BaseModel):
    local_results: list[ItemResponse]
    external_results: list[ExternalSearchResult]


class ExternalItemCreate(BaseModel):
    name: str
    full_name: str | None = None
    url: str | None = None
    description: str | None = None
    owner: str | None = None
    stars: int | None = None
    source: str | None = None
    item_type: str | None = "application"


class MultiCompareResponse(BaseModel):
    selected_items: list[str]
    common_components: list[str]
    unique_components: dict[str, list[str]]


class ComparisonRow(BaseModel):
    component_name: str
    present_in: list[str]
    category: str


class VulnerabilityAlertCreate(BaseModel):
    component_name: str
    component_version: str | None = None
    cve_id: str | None = None
    severity: str | None = None
    description: str | None = None


class SbomRequestCreate(BaseModel):
    product_name: str
    description: str | None = None


class SbomRequestResponse(BaseModel):
    id: int
    product_name: str
    description: str | None = None
    status: str
    upvotes: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True