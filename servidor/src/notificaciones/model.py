"""
Notificacion model - System notifications
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Enum as SQLEnum, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from src.base_model import BaseModel
from datetime import datetime
import enum


class TipoNotificacion(str, enum.Enum):
    """Tipos de notificaciones del sistema"""
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


class PrioridadNotificacion(str, enum.Enum):
    """Prioridad de la notificación"""
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


class Notificacion(BaseModel):
    """Notificaciones del sistema para usuarios"""
    __tablename__ = "notificaciones"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(SQLEnum(TipoNotificacion), nullable=False, index=True)
    prioridad = Column(SQLEnum(PrioridadNotificacion), default=PrioridadNotificacion.MEDIA, nullable=False)
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=False)
    datos_adicionales = Column(JSON, nullable=True)
    leida = Column(Boolean, default=False, nullable=False, index=True)
    fecha_lectura = Column(DateTime, nullable=True)
    email_enviado = Column(Boolean, default=False, nullable=False)
    fecha_envio_email = Column(DateTime, nullable=True)
    accion_url = Column(String(500), nullable=True)
    accion_texto = Column(String(100), nullable=True)
    expira_en = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notificaciones")
    
    def __repr__(self):
        return f"<Notificacion(user_id={self.user_id}, tipo={self.tipo}, leida={self.leida})>"
    
    @property
    def esta_leida(self) -> bool:
        """Verifica si la notificación está leída"""
        return self.leida
    
    @property
    def esta_vigente(self) -> bool:
        """Verifica si la notificación está vigente"""
        if not self.expira_en:
            return True
        return datetime.utcnow() < self.expira_en
    
    @property
    def es_urgente(self) -> bool:
        """Verifica si es urgente"""
        return self.prioridad == PrioridadNotificacion.URGENTE
    
    def marcar_leida(self):
        """Marca la notificación como leída"""
        self.leida = True
        self.fecha_lectura = datetime.utcnow()
    
    def marcar_email_enviado(self):
        """Marca que el email fue enviado"""
        self.email_enviado = True
        self.fecha_envio_email = datetime.utcnow()
