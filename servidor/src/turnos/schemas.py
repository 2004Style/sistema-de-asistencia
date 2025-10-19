"""
Turno schemas for API validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import time


class TurnoBase(BaseModel):
    """Base Turno schema"""
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del turno")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción del turno")
    hora_inicio: time = Field(..., description="Hora de inicio del turno (HH:MM)")
    hora_fin: time = Field(..., description="Hora de fin del turno (HH:MM)")
    activo: bool = Field(default=True, description="Estado del turno")
    
    @field_validator('nombre')
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v or not v.strip():
            raise ValueError('El nombre del turno no puede estar vacío')
        return v.strip()


class TurnoCreate(TurnoBase):
    """Schema for creating a Turno"""
    pass


class TurnoUpdate(BaseModel):
    """Schema for updating a Turno"""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    activo: Optional[bool] = None
    
    @field_validator('nombre')
    @classmethod
    def nombre_no_vacio(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('El nombre del turno no puede estar vacío')
        return v.strip() if v else v


class TurnoResponse(TurnoBase):
    """Schema for Turno response"""
    id: int
    duracion_horas: float = Field(..., description="Duración del turno en horas")
    es_turno_nocturno: bool = Field(..., description="Indica si el turno cruza medianoche")
    
    class Config:
        from_attributes = True


class TurnoList(BaseModel):
    """Schema for list of Turnos"""
    total: int
    turnos: list[TurnoResponse]
