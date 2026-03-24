from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)
    category = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    description = Column(String, nullable=True)

    components = relationship("ItemComponent", back_populates="item")


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