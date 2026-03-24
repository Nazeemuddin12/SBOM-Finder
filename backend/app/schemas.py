from pydantic import BaseModel


class ItemResponse(BaseModel):
    id: int
    name: str
    item_type: str
    category: str | None = None
    manufacturer: str | None = None
    developer: str | None = None
    operating_system: str | None = None
    description: str | None = None

    class Config:
        from_attributes = True
class ComponentResponse(BaseModel):
    component_name: str
    version: str | None = None
    supplier: str | None = None
    license: str | None = None

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

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_items: int
    total_devices: int
    total_applications: int
    total_components: int

class MultiCompareResponse(BaseModel):
    selected_items: list[str]
    common_components: list[str]
    unique_components: dict[str, list[str]]

class ComparisonRow(BaseModel):
    component_name: str
    present_in: list[str]
    category: str


class DetailedMultiCompareResponse(BaseModel):
    selected_items: list[str]
    comparison_rows: list[ComparisonRow]

class DetailedComparisonRow(BaseModel):
    component_name: str
    category: str
    item_details: dict[str, dict[str, str | None]]


class AdvancedCompareResponse(BaseModel):
    selected_items: list[str]
    comparison_rows: list[DetailedComparisonRow]    