"""
Modelo de Justificacion.

Representa justificaciones de ausencias o tardanzas con sistema de aprobación.
"""

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Enum as SQLEnum, Text, DateTime
from sqlalchemy.orm import relationship
from src.base_model import BaseModel
from datetime import datetime
import enum


class TipoJustificacion(str, enum.Enum):
    """
    Tipos de justificación.
    Requerimiento #10
    """
    MEDICA = "medica"  # Cita médica, enfermedad
    PERSONAL = "personal"  # Asuntos personales
    FAMILIAR = "familiar"  # Emergencia familiar
    ACADEMICA = "academica"  # Estudios, capacitación
    PERMISO_AUTORIZADO = "permiso_autorizado"  # Permiso pre-aprobado
    VACACIONES = "vacaciones"  # Vacaciones aprobadas
    LICENCIA = "licencia"  # Licencia (maternidad, paternidad, etc.)
    OTRO = "otro"  # Otro motivo


class EstadoJustificacion(str, enum.Enum):
    """
    Estado de la justificación.
    Requerimiento #10: Requiere aprobación de administrador
    """
    PENDIENTE = "pendiente"  # Esperando aprobación
    APROBADA = "aprobada"  # Aprobada por administrador
    RECHAZADA = "rechazada"  # Rechazada por administrador
    CANCELADA = "cancelada"  # Cancelada por el usuario


class Justificacion(BaseModel):
    """
    Justificación de ausencias o tardanzas.
    Requerimiento #10: Sistema de justificaciones con aprobación
    """
    __tablename__ = "justificaciones"
    
    # Usuario que solicita la justificación
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Período de la justificación
    fecha_inicio = Column(Date, nullable=False)  # Fecha de inicio
    fecha_fin = Column(Date, nullable=False)  # Fecha de fin (puede ser el mismo día)
    
    # Tipo y motivo
    tipo = Column(SQLEnum(TipoJustificacion), nullable=False)
    motivo = Column(Text, nullable=False)  # Explicación detallada
    
    # Estado de la justificación
    estado = Column(SQLEnum(EstadoJustificacion), default=EstadoJustificacion.PENDIENTE, nullable=False)
    
    # Aprobación
    aprobado_por = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    fecha_revision = Column(DateTime, nullable=True)  # Fecha de aprobación/rechazo
    comentario_revisor = Column(Text, nullable=True)  # Comentario del revisor
    
    # Documentación de respaldo
    documento_url = Column(String(500), nullable=True)  # URL del documento adjunto (certificado médico, etc.)
    
    # Notificación enviada
    notificacion_enviada = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="justificaciones")
    # Aprobador (puede ser null si aún no ha sido procesada)
    aprobador = relationship("User", foreign_keys=[aprobado_por])
    asistencias = relationship("Asistencia", back_populates="justificacion")
    
    def __repr__(self):
        return f"<Justificacion(user_id={self.user_id}, tipo={self.tipo}, estado={self.estado})>"
    
    @property
    def dias_justificados(self) -> int:
        """Calcula el número de días justificados"""
        if not self.fecha_inicio or not self.fecha_fin:
            return 0
        delta = self.fecha_fin - self.fecha_inicio
        return delta.days + 1
    
    @property
    def esta_aprobada(self) -> bool:
        """Verifica si la justificación está aprobada"""
        return self.estado == EstadoJustificacion.APROBADA
    
    @property
    def esta_pendiente(self) -> bool:
        """Verifica si la justificación está pendiente"""
        return self.estado == EstadoJustificacion.PENDIENTE
    
    def aprobar(self, aprobador_id: int, comentario: str = None):
        """Aprueba la justificación"""
        self.estado = EstadoJustificacion.APROBADA
        self.aprobado_por = aprobador_id
        self.fecha_revision = datetime.utcnow()
        if comentario:
            self.comentario_revisor = comentario
    
    def rechazar(self, rechazador_id: int, comentario: str):
        """Rechaza la justificación"""
        self.estado = EstadoJustificacion.RECHAZADA
        self.aprobado_por = rechazador_id
        self.fecha_revision = datetime.utcnow()
        self.comentario_revisor = comentario
    
    def cancelar(self):
        """Cancela la justificación"""
        self.estado = EstadoJustificacion.CANCELADA
