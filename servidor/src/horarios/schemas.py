"""
Schemas de validación para el módulo de horarios.

Define los modelos Pydantic para validar requests y responses
de los endpoints de horarios. Soporta múltiples turnos por día.
"""

from pydantic import BaseModel, field_validator, ConfigDict
from datetime import time, datetime
from typing import Optional
from src.horarios.model import DiaSemana


class HorarioBase(BaseModel):
    """Schema base para horario con campos comunes."""
    dia_semana: DiaSemana
    turno_id: int
    hora_entrada: time
    hora_salida: time
    horas_requeridas: int  # En minutos
    tolerancia_entrada: int = 15
    tolerancia_salida: int = 15
    activo: bool = True
    descripcion: Optional[str] = None


class HorarioCreate(HorarioBase):
    """
    Schema para creación de horario.
    
    Incluye validaciones de horas y turno.
    """
    user_id: int
    
    @field_validator('horas_requeridas')
    @classmethod
    def validate_horas(cls, v):
        """Valida que las horas requeridas estén en rango válido."""
        if v <= 0 or v > 1440:  # Max 24 horas
            raise ValueError('Horas requeridas debe estar entre 1 y 1440 minutos')
        return v
    
    @field_validator('turno_id')
    @classmethod
    def validate_turno(cls, v):
        """Valida que el turno_id sea positivo."""
        if v <= 0:
            raise ValueError('El turno_id debe ser un número positivo')
        return v
    
    @field_validator('hora_salida')
    @classmethod
    def validate_horas_orden(cls, v, info):
        """
        Validación de hora_salida.
        Permite turnos nocturnos (hora_salida < hora_entrada).
        """
        if 'hora_entrada' in info.data:
            entrada_mins = info.data['hora_entrada'].hour * 60 + info.data['hora_entrada'].minute
            salida_mins = v.hour * 60 + v.minute
            
            # Si hora_salida == hora_entrada, es inválido
            if salida_mins == entrada_mins:
                raise ValueError('Hora de salida no puede ser igual a hora de entrada')
        return v


class HorarioUpdate(BaseModel):
    """
    Schema para actualización de horario.
    
    Todos los campos son opcionales.
    """
    turno_id: Optional[int] = None
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    horas_requeridas: Optional[int] = None
    tolerancia_entrada: Optional[int] = None
    tolerancia_salida: Optional[int] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class HorarioResponse(HorarioBase):
    """
    Schema para respuesta de horario.
    
    Incluye todos los campos del horario.
    """
    id: int
    user_id: int
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    turno_nombre: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
