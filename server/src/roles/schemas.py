"""
Schemas de validación para Roles
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class RoleBase(BaseModel):
    """Schema base para Role"""
    nombre: str = Field(..., min_length=3, max_length=50, description="Nombre del rol")
    descripcion: Optional[str] = Field(None, description="Descripción del rol")
    es_admin: bool = Field(default=False, description="¿Es administrador del sistema?")
    puede_aprobar: bool = Field(default=False, description="¿Puede aprobar justificaciones?")
    puede_ver_reportes: bool = Field(default=False, description="¿Puede ver reportes?")
    puede_gestionar_usuarios: bool = Field(default=False, description="¿Puede gestionar usuarios?")
    activo: bool = Field(default=True, description="¿Está activo?")


class RoleCreate(RoleBase):
    """Schema para crear un rol"""
    pass


class RoleUpdate(BaseModel):
    """Schema para actualizar un rol"""
    nombre: Optional[str] = Field(None, min_length=3, max_length=50)
    descripcion: Optional[str] = None
    es_admin: Optional[bool] = None
    puede_aprobar: Optional[bool] = None
    puede_ver_reportes: Optional[bool] = None
    puede_gestionar_usuarios: Optional[bool] = None
    activo: Optional[bool] = None


class RoleResponse(RoleBase):
    """Schema para respuesta de rol"""
    id: int
    
    model_config = ConfigDict(from_attributes=True)


class RoleListResponse(BaseModel):
    """Schema para lista de roles"""
    roles: list[RoleResponse]
    total: int
