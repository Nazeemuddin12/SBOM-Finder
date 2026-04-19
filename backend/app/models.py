from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("Item", back_populates="owner_user")
    tracked_products = relationship("TrackedProduct", back_populates="owner_user")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)   # device or application
    category = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    description = Column(String, nullable=True)

    owner = Column(String, nullable=True)
    version = Column(String, nullable=True)
    source_format = Column(String, nullable=True)   # cyclonedx / spdx / seed
    source_name = Column(String, nullable=True)

    components = relationship("ItemComponent", back_populates="item")
    owner_user = relationship("User", back_populates="items")


class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    component_name = Column(String, nullable=False)
    version = Column(String, nullable=True)
    supplier = Column(String, nullable=True)
    license = Column(String, nullable=True)

    items = relationship("ItemComponent", back_populates="component")


class ItemComponent(Base):
    __tablename__ = "item_components"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    component_id = Column(Integer, ForeignKey("components.id"))

    item = relationship("Item", back_populates="components")
    component = relationship("Component", back_populates="items")

class TrackedProduct(Base):
    __tablename__ = "tracked_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    product_type = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    status = Column(String, nullable=True, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_checked = Column(DateTime, nullable=True)

    sources = relationship("SourceRecord", back_populates="tracked_product")
    owner_user = relationship("User", back_populates="tracked_products")


class SourceRecord(Base):
    __tablename__ = "source_records"

    id = Column(Integer, primary_key=True, index=True)
    tracked_product_id = Column(Integer, ForeignKey("tracked_products.id"))
    source_type = Column(String, nullable=True)
    source_title = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    fetch_status = Column(String, nullable=True)
    confidence = Column(String, nullable=True)
    last_fetched = Column(DateTime, nullable=True)

    tracked_product = relationship("TrackedProduct", back_populates="sources")    