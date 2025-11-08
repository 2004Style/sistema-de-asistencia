"""
Schemas de validación para el módulo de asistencias.

Define los modelos Pydantic para validar requests y responses
de los endpoints de asistencias.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date, time, datetime
from typing import Optional, List
from enum import Enum


# Enums para validación
class EstadoAsistenciaEnum(str, Enum):
    PRESENTE = "presente"
    AUSENTE = "ausente"
    TARDE = "tarde"
    JUSTIFICADO = "justificado"
    PERMISO = "permiso"


class MetodoRegistroEnum(str, Enum):
    HUELLA = "huella"  # Registro por huella dactilar (WebSocket)
    MANUAL = "manual"  # Registro manual por administrador (HTTP)
    FACIAL = "facial"  # Registro por reconocimiento facial (imagen)


class AsistenciaBase(BaseModel):
    """Schema base para asistencia con campos comunes."""
    user_id: int
    fecha: date
    
    model_config = ConfigDict(from_attributes=True)


class AsistenciaCreate(AsistenciaBase):
    """Schema para crear asistencia desde WebSocket (automático)."""
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    # huella_* eliminados del schema: el registro ya no almacena huellas en asistencias


class AsistenciaManualCreate(BaseModel):
    """
    Schema para crear asistencia manualmente (HTTP).
    Requerimiento #4: Registro manual autorizado.
    
    NOTA DE SEGURIDAD:
    - fecha: Se toma automáticamente del servidor
    - hora: Se toma la hora actual del servidor
    - tipo_registro: OPCIONAL - Se detecta automáticamente si es entrada o salida
    - estado: Se calcula automáticamente según tardanza
    - validación: Solo dentro del horario configurado
    """
    user_id: int = Field(..., description="ID del usuario a registrar")
    tipo_registro: Optional[str] = Field(
        None, 
        pattern="^(entrada|salida)$", 
        description="Tipo de registro (opcional, se detecta automáticamente)"
    )
    observaciones: str = Field(..., min_length=10, description="Motivo del registro manual")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "user_id": 1,
                "tipo_registro": "entrada",
                "observaciones": "Registro manual por falla en el sistema biométrico"
            }
        }
    )


class AsistenciaUpdate(BaseModel):
    """Schema para actualización de asistencia."""
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    estado: Optional[EstadoAsistenciaEnum] = None
    observaciones: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class AsistenciaResponse(BaseModel):
    """
    Schema para respuesta de asistencia.
    
    Incluye todos los campos de asistencia e información del usuario.
    """
    id: int
    user_id: int
    horario_id: Optional[int] = Field(None, description="ID del horario/turno asociado")
    fecha: date
    hora_entrada: Optional[time]
    hora_salida: Optional[time]
    metodo_entrada: Optional[str]
    metodo_salida: Optional[str]
    estado: str
    tardanza: bool
    minutos_tardanza: Optional[int]
    minutos_trabajados: Optional[int] = Field(None, description="Total de minutos trabajados")
    horas_trabajadas_formato: Optional[str] = Field(None, description="Horas en formato HH:MM")
    justificacion_id: Optional[int]
    observaciones: Optional[str]
    # es_manual eliminado del response
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Información del usuario
    nombre_usuario: Optional[str] = Field(None, description="Nombre completo del usuario")
    codigo_usuario: Optional[str] = Field(None, description="Código del usuario")
    email_usuario: Optional[str] = Field(None, description="Correo electrónico del usuario")
    
    model_config = ConfigDict(from_attributes=True)


class AsistenciaConUsuario(AsistenciaResponse):
    """Schema con información de usuario (deprecated, usar AsistenciaResponse)."""
    nombre_usuario: str
    codigo_user: str
    
    model_config = ConfigDict(from_attributes=True)


class AsistenciaListResponse(BaseModel):
    """Schema para lista de asistencias."""
    total: int
    asistencias: List[AsistenciaResponse]
    
    model_config = ConfigDict(from_attributes=True)


class RegistroEntradaWS(BaseModel):
    """Schema para registro de entrada por WebSocket."""
    user_id: int
    # huella_data y ubicacion se manejan por el sensor; no se requieren en el schema
    
    model_config = ConfigDict(from_attributes=True)


class RegistroSalidaWS(BaseModel):
    """Schema para registro de salida por WebSocket."""
    user_id: int
    asistencia_id: int
    # huella_data y ubicacion eliminados
    
    model_config = ConfigDict(from_attributes=True)
