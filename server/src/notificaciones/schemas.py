"""
Schemas de validación para Notificaciones
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class TipoNotificacionEnum(str, Enum):
    """Tipos de notificaciones"""
    TARDANZA = "tardanza"
    AUSENCIA = "ausencia"
    ALERTA = "alerta"
    JUSTIFICACION = "justificacion"
    APROBACION = "aprobacion"
    RECHAZO = "rechazo"
    RECORDATORIO = "recordatorio"
    SISTEMA = "sistema"
    EXCESO_JORNADA = "exceso_jornada"
    INCUMPLIMIENTO_JORNADA = "incumplimiento_jornada"


class PrioridadEnum(str, Enum):
    """Prioridad de notificación"""
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


class NotificacionBase(BaseModel):
    """Schema base para Notificacion"""
    tipo: TipoNotificacionEnum = Field(..., description="Tipo de notificación")
    prioridad: PrioridadEnum = Field(default=PrioridadEnum.MEDIA, description="Prioridad")
    titulo: str = Field(..., min_length=1, max_length=200, description="Título")
    mensaje: str = Field(..., min_length=1, description="Mensaje")
    datos_adicionales: Optional[dict] = Field(None, description="Datos adicionales")
    accion_url: Optional[str] = Field(None, max_length=500, description="URL de acción")
    accion_texto: Optional[str] = Field(None, max_length=100, description="Texto de acción")


class NotificacionCreate(NotificacionBase):
    """Schema para crear notificación"""
    user_id: int = Field(..., description="ID del usuario")


class NotificacionUpdate(BaseModel):
    """Schema para actualizar notificación"""
    leida: Optional[bool] = None


class NotificacionResponse(NotificacionBase):
    """Schema para respuesta de notificación"""
    id: int
    user_id: int
    leida: bool
    fecha_lectura: Optional[datetime] = None
    email_enviado: bool
    fecha_envio_email: Optional[datetime] = None
    expira_en: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class NotificacionList(BaseModel):
    """Schema para lista de notificaciones"""
    total: int
    no_leidas: int
    notificaciones: list[NotificacionResponse]
