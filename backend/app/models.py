from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)  # never store plain text passwords
    role = Column(String, default="user", nullable=False)  # "user" or "admin"
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)  # admins can deactivate without deleting

    items = relationship("Item", back_populates="owner_user")
    tracked_products = relationship("TrackedProduct", back_populates="owner_user")
    audit_logs = relationship("AuditLog", back_populates="user")


class Item(Base):
    # An Item is the top-level SBOM record — one device or application
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)  # "device" or "application"
    category = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    description = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    version = Column(String, nullable=True)
    source_format = Column(String, nullable=True)  # cyclonedx | spdx | ai_discovered | live_fetched | syft_generated | external
    source_name = Column(String, nullable=True)

    # public catalog fields
    is_public = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)   # manually verified by an admin
    is_featured = Column(Boolean, default=False)   # pinned to top of public catalog
    approval_status = Column(String, default="private")  # private | pending | approved | rejected
    rejection_note = Column(Text, nullable=True)
    upvotes = Column(Integer, default=0)
    public_submitted_at = Column(DateTime, nullable=True)
    public_approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    components = relationship("ItemComponent", back_populates="item")
    owner_user = relationship("User", back_populates="items")


class Component(Base):
    # A single software library or package — shared across many items
    # If two products both use "openssl 3.1.0" they point to the same row here
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    component_name = Column(String, nullable=False)
    version = Column(String, nullable=True)
    supplier = Column(String, nullable=True)
    license = Column(String, nullable=True)
    is_vulnerable = Column(Boolean, default=False)      # flagged by admin
    vulnerability_note = Column(Text, nullable=True)
    vulnerability_cve = Column(String, nullable=True)   # e.g. "CVE-2021-44228"

    items = relationship("ItemComponent", back_populates="component")


class ItemComponent(Base):
    # Join table — links Items to Components in a many-to-many relationship
    # One item has many components, one component can appear in many items
    __tablename__ = "item_components"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    component_id = Column(Integer, ForeignKey("components.id"))

    item = relationship("Item", back_populates="components")
    component = relationship("Component", back_populates="items")


class TrackedProduct(Base):
    # Products the user is watching — status tracks how much SBOM data we found
    __tablename__ = "tracked_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    product_type = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    status = Column(String, nullable=True, default="pending")  # pending | partial | complete
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, nullable=True)

    sources = relationship("SourceRecord", back_populates="tracked_product")
    owner_user = relationship("User", back_populates="tracked_products")


class SourceRecord(Base):
    # A data source discovered for a tracked product (e.g. a GitHub repo)
    __tablename__ = "source_records"

    id = Column(Integer, primary_key=True, index=True)
    tracked_product_id = Column(Integer, ForeignKey("tracked_products.id"))
    source_type = Column(String, nullable=True)       # "github", "nvd", etc.
    source_title = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    fetch_status = Column(String, nullable=True)      # "success" or "failed"
    confidence = Column(String, nullable=True)        # e.g. "0.70" = 70% match confidence
    last_fetched = Column(DateTime, nullable=True)

    tracked_product = relationship("TrackedProduct", back_populates="sources")


class AuditLog(Base):
    # Immutable record of admin actions — never update or delete rows here
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)           # e.g. "approve_item", "flag_vulnerable"
    resource_type = Column(String, nullable=True)     # "item", "component", "user"
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class VulnerabilityAlert(Base):
    # Created when an admin flags a component — keeps a history of disclosures
    __tablename__ = "vulnerability_alerts"

    id = Column(Integer, primary_key=True, index=True)
    component_name = Column(String, nullable=False)
    component_version = Column(String, nullable=True)
    cve_id = Column(String, nullable=True)
    severity = Column(String, nullable=True)          # "low" | "medium" | "high" | "critical"
    description = Column(Text, nullable=True)
    flagged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SbomRequest(Base):
    # Community requests for SBOMs that don't exist yet — users can upvote them
    __tablename__ = "sbom_requests"

    id = Column(Integer, primary_key=True, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="open")           # "open" | "fulfilled" | "closed"
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    fulfilled_at = Column(DateTime, nullable=True)
    fulfilled_item_id = Column(Integer, ForeignKey("items.id"), nullable=True)