"""
Schemas de Pydantic para la entidad Justificacion.

Define los schemas de validación para crear, actualizar y responder justificaciones.
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from .model import TipoJustificacion, EstadoJustificacion


class JustificacionBase(BaseModel):
    """Schema base para Justificacion con campos comunes."""
    fecha_inicio: date = Field(..., description="Fecha de inicio de la justificación")
    fecha_fin: date = Field(..., description="Fecha de fin de la justificación")
    tipo: TipoJustificacion = Field(..., description="Tipo de justificación")
    motivo: str = Field(..., min_length=10, max_length=1000, description="Motivo de la justificación")
    documento_url: Optional[str] = Field(None, max_length=500, description="URL del documento adjunto")

    @field_validator('fecha_fin')
    @classmethod
    def validar_fecha_fin(cls, v, info):
        """Valida que la fecha de fin sea posterior o igual a la fecha de inicio."""
        if 'fecha_inicio' in info.data:
            if v < info.data['fecha_inicio']:
                raise ValueError('La fecha de fin no puede ser anterior a la fecha de inicio')
        return v


class JustificacionCreate(JustificacionBase):
    """Schema para crear una nueva justificación."""
    user_id: int = Field(..., gt=0, description="ID del usuario que crea la justificación")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "fecha_inicio": "2024-01-15",
                "fecha_fin": "2024-01-17",
                "tipo": "medica",
                "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
                "documento_url": "https://example.com/certificados/cert_123.pdf"
            }
        }
    )


class JustificacionUpdate(BaseModel):
    """Schema para actualizar una justificación existente. Solo pendientes pueden actualizarse."""
    fecha_inicio: Optional[date] = Field(None, description="Fecha de inicio de la justificación")
    fecha_fin: Optional[date] = Field(None, description="Fecha de fin de la justificación")
    tipo: Optional[TipoJustificacion] = Field(None, description="Tipo de justificación")
    motivo: Optional[str] = Field(None, min_length=10, max_length=1000, description="Motivo de la justificación")
    documento_url: Optional[str] = Field(None, max_length=500, description="URL del documento adjunto")

    @field_validator('fecha_fin')
    @classmethod
    def validar_fecha_fin(cls, v, info):
        """Valida que la fecha de fin sea posterior o igual a la fecha de inicio si ambas están presentes."""
        if v is not None and 'fecha_inicio' in info.data and info.data['fecha_inicio'] is not None:
            if v < info.data['fecha_inicio']:
                raise ValueError('La fecha de fin no puede ser anterior a la fecha de inicio')
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "motivo": "Gripe fuerte con fiebre y dolor de garganta. Adjunto certificado médico actualizado.",
                "documento_url": "https://example.com/certificados/cert_123_v2.pdf"
            }
        }
    )


class JustificacionApproval(BaseModel):
    """Schema para aprobar o rechazar una justificación."""
    estado: EstadoJustificacion = Field(..., description="Nuevo estado (APROBADA o RECHAZADA)")
    comentario_revisor: Optional[str] = Field(None, max_length=500, description="Comentario del revisor")

    @field_validator('estado')
    @classmethod
    def validar_estado(cls, v):
        """Valida que solo se pueda aprobar o rechazar."""
        if v not in [EstadoJustificacion.APROBADA, EstadoJustificacion.RECHAZADA]:
            raise ValueError('El estado debe ser APROBADA o RECHAZADA')
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "estado": "APROBADA",
                "comentario_revisor": "Certificado médico válido. Justificación aprobada."
            }
        }
    )


class JustificacionResponse(JustificacionBase):
    """Schema para la respuesta de una justificación."""
    id: int = Field(..., description="ID de la justificación")
    user_id: int = Field(..., description="ID del usuario")
    estado: EstadoJustificacion = Field(..., description="Estado de la justificación")
    fecha_revision: Optional[datetime] = Field(None, description="Fecha de revisión")
    aprobado_por: Optional[int] = Field(None, description="ID del aprobador")
    comentario_revisor: Optional[str] = Field(None, description="Comentario del revisor")
    dias_justificados: int = Field(..., description="Cantidad de días justificados")
    esta_aprobada: bool = Field(..., description="Si la justificación está aprobada")
    esta_pendiente: bool = Field(..., description="Si la justificación está pendiente")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: Optional[datetime] = Field(None, description="Fecha de última actualización")
    
    # Datos del usuario relacionado
    usuario_nombre: Optional[str] = Field(None, description="Nombre del usuario")
    usuario_email: Optional[str] = Field(None, description="Email del usuario")
    
    # Datos del revisor
    revisor_nombre: Optional[str] = Field(None, description="Nombre del revisor")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "user_id": 1,
                "fecha_inicio": "2024-01-15",
                "fecha_fin": "2024-01-17",
                "tipo": "medica",
                "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
                "documento_url": "https://example.com/certificados/cert_123.pdf",
                "estado": "APROBADA",
                "fecha_revision": "2024-01-15T10:30:00",
                "aprobado_por": 2,
                "comentario_revisor": "Certificado médico válido. Justificación aprobada.",
                "dias_justificados": 3,
                "esta_aprobada": True,
                "esta_pendiente": False,
                "created_at": "2024-01-14T08:00:00",
                "updated_at": "2024-01-15T10:30:00",
                "usuario_nombre": "Juan Pérez",
                "usuario_email": "juan@example.com",
                "revisor_nombre": "María González"
            }
        }
    )


class JustificacionEstadisticas(BaseModel):
    """Schema para estadísticas de justificaciones."""
    total: int = Field(..., description="Total de justificaciones")
    pendientes: int = Field(..., description="Justificaciones pendientes")
    aprobadas: int = Field(..., description="Justificaciones aprobadas")
    rechazadas: int = Field(..., description="Justificaciones rechazadas")
    por_tipo: dict[str, int] = Field(..., description="Cantidad por tipo de justificación")
    dias_totales_justificados: int = Field(..., description="Total de días justificados")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total": 25,
                "pendientes": 5,
                "aprobadas": 18,
                "rechazadas": 2,
                "por_tipo": {
                    "medica": 12,
                    "personal": 8,
                    "familiar": 3,
                    "otro": 2
                },
                "dias_totales_justificados": 45
            }
        }
    )
