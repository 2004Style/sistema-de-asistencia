"""
Schemas de validación para el módulo de usuarios.

Define los modelos Pydantic para validar requests y responses
de los endpoints de usuarios.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Schema base para usuario con campos comunes."""
    name: str
    email: EmailStr
    codigo_user: str
    role_id: int


class UserCreate(UserBase):
    """
    Schema para creación de usuario.
    
    Requiere confirmación de contraseña y validación de longitud mínima.
    La huella digital es opcional y se puede registrar posteriormente
    usando el endpoint de actualizar_huella.
    """
    password: str
    confirm_password: str
    huella: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Valida que la contraseña tenga al menos 8 caracteres."""
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        """Valida que las contraseñas coincidan."""
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Las contraseñas no coinciden')
        return v


class UserUpdate(BaseModel):
    """
    Schema para actualización de usuario.
    
    Todos los campos son opcionales.
    """
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    codigo_user: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    huella: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Valida que la contraseña tenga al menos 8 caracteres si se proporciona."""
        if v is not None and len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v


class UserResponse(UserBase):
    """
    Schema para respuesta de usuario.
    
    Incluye todos los campos del usuario excepto la contraseña.
    Incluye la huella digital si está registrada.
    """
    id: int
    is_active: bool
    huella: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    isAdmin: bool
    isSupervisor: bool
    facial_recognize: bool
    
    model_config = {"from_attributes": True}


# ============ AUTHENTICATION SCHEMAS ============


class BackendTokens(BaseModel):
    """Schema para los tokens generados en autenticación."""
    accessToken: str
    refreshToken: str
    expiresIn: int  # En segundos


class LoginRequest(BaseModel):
    """Schema para solicitud de login."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """
    Schema para respuesta de login.
    
    Retorna la información del usuario y los tokens de autenticación.
    """
    user: UserResponse
    backendTokens: BackendTokens

