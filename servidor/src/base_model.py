"""
Base model with common fields and functionality
"""
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from src.config.database import Base


class BaseModel(Base):
    """
    Abstract base model with common fields.
    All models should inherit from this.
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
