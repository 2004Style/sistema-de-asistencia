"""
Modelo de Asistencia.

Define la estructura de datos para registros de asistencia,
soportando múltiples turnos y métodos de registro.
"""

from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Boolean, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from src.base_model import BaseModel
from datetime import datetime, timedelta
import enum


class TipoRegistro(str, enum.Enum):
    """
    Tipo de registro de asistencia.
    Requerimiento #1: Registro de entrada y salida.
    """
    ENTRADA = "entrada"
    SALIDA = "salida"
    MANUAL = "manual"  # Requerimiento #4: Registro manual


class MetodoRegistro(str, enum.Enum):
    """
    Método usado para el registro.
    Requerimiento #3, #4
    """
    HUELLA = "huella"  # Registro por huella dactilar (WebSocket)
    MANUAL = "manual"  # Registro manual por administrador (HTTP)
    FACIAL = "facial"  # Registro por reconocimiento facial (imagen)


class EstadoAsistencia(str, enum.Enum):
    """
    Estado de la asistencia del día.
    Requerimiento #8
    """
    PRESENTE = "presente"  # Asistió
    AUSENTE = "ausente"  # No asistió
    TARDE = "tarde"  # Llegó tarde
    JUSTIFICADO = "justificado"  # Ausencia o tardanza justificada
    PERMISO = "permiso"  # Tiene permiso aprobado


class Asistencia(BaseModel):
    """
    Registro completo de asistencia diaria del usuario.
    
    Características:
    - Puede tener múltiples registros por día (uno por turno)
    - Soporta registro manual y automático
    - Calcula horas trabajadas y tardanzas
    
    Requerimientos: #1-#8
    """
    __tablename__ = "asistencias"
    
    # Relación con usuario (Req. #3: validar identidad)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Relación con horario específico (para múltiples turnos)
    horario_id = Column(Integer, ForeignKey("horarios.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Fecha y horas (Req. #2: hora exacta de marcación)
    fecha = Column(Date, nullable=False, index=True)
    hora_entrada = Column(Time, nullable=True)
    hora_salida = Column(Time, nullable=True)
    
    # Método de registro (Req. #3, #4)
    metodo_entrada = Column(SQLEnum(MetodoRegistro), nullable=True)
    metodo_salida = Column(SQLEnum(MetodoRegistro), nullable=True)
    
    # Datos de huella (si aplica)
    # (Campos de huella eliminados para simplificar el modelo)
    
    # Estado y validaciones (Req. #5, #8)
    estado = Column(SQLEnum(EstadoAsistencia), default=EstadoAsistencia.AUSENTE, nullable=False)
    tardanza = Column(Boolean, default=False, nullable=False)
    minutos_tardanza = Column(Integer, nullable=True)
    
    # Horas trabajadas (Req. #6, #7)
    horas_trabajadas = Column(Integer, nullable=True)  # Minutos trabajados
    
    # Justificación (Req. #10)
    justificacion_id = Column(Integer, ForeignKey("justificaciones.id", ondelete="SET NULL"), nullable=True)
    
    # Observaciones y notas
    observaciones = Column(Text, nullable=True)
    
    # Registro manual (Req. #4)
    # (es_manual eliminado — el sistema no mantiene este flag en el modelo)
    
    # Ubicación (opcional)
    # (ubicaciones eliminadas del modelo)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="asistencias")
    horario = relationship("Horario", back_populates="asistencias")
    justificacion = relationship("Justificacion", back_populates="asistencias")
    
    def __repr__(self):
        return f"<Asistencia(user_id={self.user_id}, fecha={self.fecha}, estado={self.estado})>"
    
    @property
    def horas_trabajadas_formato(self) -> str:
        """
        Retorna horas trabajadas en formato HH:MM.
        Requerimiento #6: Calcular total de horas trabajadas.
        """
        if not self.horas_trabajadas:
            return "00:00"
        hours = self.horas_trabajadas // 60
        minutes = self.horas_trabajadas % 60
        return f"{hours:02d}:{minutes:02d}"
    
    @property
    def duracion_jornada(self) -> float:
        """Retorna duración de la jornada en horas decimales."""
        if not self.horas_trabajadas:
            return 0.0
        return round(self.horas_trabajadas / 60, 2)
    
    def calcular_horas_trabajadas(self) -> int:
        """
        Calcula las horas trabajadas en minutos.
        Requerimiento #6
        """
        if not self.hora_entrada or not self.hora_salida:
            return 0
        
        # Convertir a datetime para calcular diferencia
        entrada = datetime.combine(self.fecha, self.hora_entrada)
        salida = datetime.combine(self.fecha, self.hora_salida)
        
        # Si la salida es al día siguiente (después de medianoche)
        if salida < entrada:
            salida += timedelta(days=1)
        
        diferencia = salida - entrada
        minutos = int(diferencia.total_seconds() / 60)
        
        self.horas_trabajadas = minutos
        return minutos
