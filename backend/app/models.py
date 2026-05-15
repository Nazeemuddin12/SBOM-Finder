# ============================================================
# models.py
# SBOM Finder — SQLAlchemy ORM Models
# ============================================================
# Defines the full database schema as Python classes.
# Every class here maps 1-to-1 with a database table.
#
# Table relationships at a glance:
#   User ──< Item           (one user owns many items)
#   Item ──< ItemComponent >── Component  (many-to-many via join table)
#   User ──< TrackedProduct ──< SourceRecord
#   User ──< AuditLog
#   (VulnerabilityAlert and SbomRequest reference users loosely)
# ============================================================

from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ── User ──────────────────────────────────────────────────────
class User(Base):
    """Registered account. role='admin' unlocks the moderation panel."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, unique=True, nullable=False, index=True)
    email         = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)   # bcrypt hash — never store plaintext
    role          = Column(String, default="user", nullable=False)  # "user" | "admin"
    created_at    = Column(DateTime, default=datetime.utcnow)
    is_active     = Column(Boolean, default=True)      # admins can suspend without deleting

    # Relationships — SQLAlchemy lazy-loads these on first access
    items            = relationship("Item", back_populates="owner_user")
    tracked_products = relationship("TrackedProduct", back_populates="owner_user")
    audit_logs       = relationship("AuditLog", back_populates="user")


# ── Item ───────────────────────────────────────────────────────
class Item(Base):
    """Top-level SBOM record — represents one device or application.
    An item owns many Components through the ItemComponent join table.
    Items start as private and can be submitted to the public catalog
    by the owner, then approved/rejected by an admin."""
    __tablename__ = "items"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name          = Column(String, nullable=False)
    item_type     = Column(String, nullable=False)     # "device" | "application"
    category      = Column(String, nullable=True)
    manufacturer  = Column(String, nullable=True)
    developer     = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    description   = Column(String, nullable=True)
    owner         = Column(String, nullable=True)      # free-text org name (may differ from user)
    version       = Column(String, nullable=True)

    # Where the SBOM data came from — drives the source badge in the UI
    # Values: cyclonedx | spdx | ai_discovered | live_fetched | syft_generated | external | seed
    source_format = Column(String, nullable=True)
    source_name   = Column(String, nullable=True)      # e.g. filename or package name

    # ── Public catalog fields ──────────────────────────────────
    is_public      = Column(Boolean, default=False)    # visible in /browse without login
    is_verified    = Column(Boolean, default=False)    # admin manually verified the SBOM
    is_featured    = Column(Boolean, default=False)    # pinned to top of public catalog
    # approval_status lifecycle: private → pending → approved | rejected
    approval_status    = Column(String, default="private")
    rejection_note     = Column(Text, nullable=True)   # admin's reason for rejection
    upvotes            = Column(Integer, default=0)
    public_submitted_at = Column(DateTime, nullable=True)
    public_approved_at  = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

    # Relationships
    components  = relationship("ItemComponent", back_populates="item")
    owner_user  = relationship("User", back_populates="items")


# ── Component ──────────────────────────────────────────────────
class Component(Base):
    """A single software library, package, or dependency.
    Components are deduplicated — if two products both use openssl 3.0.0
    they share the same Component row, linked via separate ItemComponent rows.
    This allows a single admin action (flagging a CVE) to affect all items."""
    __tablename__ = "components"

    id             = Column(Integer, primary_key=True, index=True)
    component_name = Column(String, nullable=False)
    version        = Column(String, nullable=True)
    supplier       = Column(String, nullable=True)
    license        = Column(String, nullable=True)
    is_vulnerable  = Column(Boolean, default=False)    # set by admin when a CVE is confirmed
    vulnerability_note = Column(Text, nullable=True)   # human-readable advisory text
    vulnerability_cve  = Column(String, nullable=True) # e.g. "CVE-2021-44228" (Log4Shell)

    items = relationship("ItemComponent", back_populates="component")


# ── ItemComponent (join table) ─────────────────────────────────
class ItemComponent(Base):
    """Many-to-many join between Item and Component.
    One item has many components; one component can belong to many items.
    This table has its own PK so we can add per-link metadata in the future."""
    __tablename__ = "item_components"

    id           = Column(Integer, primary_key=True, index=True)
    item_id      = Column(Integer, ForeignKey("items.id"))
    component_id = Column(Integer, ForeignKey("components.id"))

    item      = relationship("Item", back_populates="components")
    component = relationship("Component", back_populates="items")


# ── TrackedProduct ─────────────────────────────────────────────
class TrackedProduct(Base):
    """A product the user is monitoring for SBOM availability.
    The backend searches GitHub and other sources for SBOM data;
    'status' reflects how complete the discovered information is:
      pending  → we haven't found anything yet
      partial  → found some sources but SBOM is incomplete
      complete → full SBOM data available"""
    __tablename__ = "tracked_products"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name         = Column(String, nullable=False)
    product_type = Column(String, nullable=True)
    vendor       = Column(String, nullable=True)
    status       = Column(String, nullable=True, default="pending")  # pending | partial | complete
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, nullable=True)

    sources    = relationship("SourceRecord", back_populates="tracked_product")
    owner_user = relationship("User", back_populates="tracked_products")


# ── SourceRecord ───────────────────────────────────────────────
class SourceRecord(Base):
    """A data source discovered for a TrackedProduct (e.g. a GitHub repo).
    One tracked product can have multiple source records — for instance a
    GitHub repo, an NVD entry, and a vendor advisory page."""
    __tablename__ = "source_records"

    id                  = Column(Integer, primary_key=True, index=True)
    tracked_product_id  = Column(Integer, ForeignKey("tracked_products.id"))
    source_type         = Column(String, nullable=True)   # "github" | "nvd" | "vendor"
    source_title        = Column(String, nullable=True)   # human-readable label
    source_url          = Column(String, nullable=True)
    fetch_status        = Column(String, nullable=True)   # "success" | "failed"
    confidence          = Column(String, nullable=True)   # "0.70" = 70% name-match confidence
    last_fetched        = Column(DateTime, nullable=True)

    tracked_product = relationship("TrackedProduct", back_populates="sources")


# ── AuditLog ───────────────────────────────────────────────────
class AuditLog(Base):
    """Immutable record of every admin action.
    Never update or delete rows here — append only.
    Provides a forensic trail of moderation decisions."""
    __tablename__ = "audit_logs"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    action        = Column(String, nullable=False)     # e.g. "approve_item", "flag_vulnerable"
    resource_type = Column(String, nullable=True)      # "item" | "component" | "user"
    resource_id   = Column(Integer, nullable=True)     # PK of the affected row
    details       = Column(Text, nullable=True)        # JSON or free text with extra context
    created_at    = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


# ── VulnerabilityAlert ─────────────────────────────────────────
class VulnerabilityAlert(Base):
    """Created when an admin flags a component with a known CVE.
    Keeps a history of all security disclosures — one row per disclosure event.
    severity values: "low" | "medium" | "high" | "critical"."""
    __tablename__ = "vulnerability_alerts"

    id                = Column(Integer, primary_key=True, index=True)
    component_name    = Column(String, nullable=False)
    component_version = Column(String, nullable=True)
    cve_id            = Column(String, nullable=True)  # e.g. "CVE-2021-44228"
    severity          = Column(String, nullable=True)  # low | medium | high | critical
    description       = Column(Text, nullable=True)
    flagged_by        = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)


# ── SbomRequest ────────────────────────────────────────────────
class SbomRequest(Base):
    """Community request for an SBOM that doesn't exist yet.
    Any user can submit a request; others can upvote it to signal demand.
    status values: "open" | "fulfilled" | "closed"
    When fulfilled, fulfilled_item_id links to the created Item."""
    __tablename__ = "sbom_requests"

    id               = Column(Integer, primary_key=True, index=True)
    requested_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_name     = Column(String, nullable=False)
    description      = Column(Text, nullable=True)
    status           = Column(String, default="open")  # open | fulfilled | closed
    upvotes          = Column(Integer, default=0)
    created_at       = Column(DateTime, default=datetime.utcnow)
    fulfilled_at     = Column(DateTime, nullable=True)
    fulfilled_item_id = Column(Integer, ForeignKey("items.id"), nullable=True)