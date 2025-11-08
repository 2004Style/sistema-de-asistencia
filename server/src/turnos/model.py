"""
Turno model - Work shifts
Define los diferentes turnos de trabajo (mañana, tarde, noche, etc.)
"""
from sqlalchemy import Column, String, Time, Boolean
from sqlalchemy.orm import relationship
from src.base_model import BaseModel


class Turno(BaseModel):
    """
    Turno de trabajo
    Define los turnos disponibles en la organización
    """
    __tablename__ = "turnos"
    
    nombre = Column(String(100), nullable=False, unique=True)
    descripcion = Column(String(255), nullable=True)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    horarios = relationship("Horario", back_populates="turno", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Turno(id={self.id}, nombre={self.nombre}, inicio={self.hora_inicio}, fin={self.hora_fin})>"
    
    @property
    def duracion_horas(self) -> float:
        """Calcula la duración del turno en horas"""
        inicio_minutos = self.hora_inicio.hour * 60 + self.hora_inicio.minute
        fin_minutos = self.hora_fin.hour * 60 + self.hora_fin.minute
        
        if fin_minutos < inicio_minutos:
            duracion_minutos = (24 * 60 - inicio_minutos) + fin_minutos
        else:
            duracion_minutos = fin_minutos - inicio_minutos
        
        return round(duracion_minutos / 60, 2)
    
    @property
    def es_turno_nocturno(self) -> bool:
        """Determina si el turno cruza la medianoche"""
        inicio_minutos = self.hora_inicio.hour * 60 + self.hora_inicio.minute
        fin_minutos = self.hora_fin.hour * 60 + self.hora_fin.minute
        return fin_minutos < inicio_minutos
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "hora_inicio": self.hora_inicio.strftime("%H:%M") if self.hora_inicio else None,
            "hora_fin": self.hora_fin.strftime("%H:%M") if self.hora_fin else None,
            "activo": self.activo,
            "duracion_horas": self.duracion_horas,
            "es_turno_nocturno": self.es_turno_nocturno,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
