"""
Modelo de Horario.

Define la estructura de datos para horarios laborales de usuarios,
soportando múltiples turnos por día.
"""

from sqlalchemy import Column, Integer, String, Time, Boolean, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from src.base_model import BaseModel
import enum


class DiaSemana(str, enum.Enum):
    """Días de la semana."""
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"


class Horario(BaseModel):
    """
    Horario laboral del usuario.
    
    Características:
    - Cada usuario puede tener múltiples horarios por día (múltiples turnos)
    - Cada horario está asociado a un turno específico
    - Un usuario puede tener horarios en diferentes turnos (mañana, tarde, noche)
    
    Requerimientos #7, #9
    """
    __tablename__ = "horarios"
    
    # Usuario
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Turno (relación con el modelo Turno)
    turno_id = Column(Integer, ForeignKey("turnos.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Día de la semana
    dia_semana = Column(SQLEnum(DiaSemana), nullable=False)
    
    # Horarios
    hora_entrada = Column(Time, nullable=False)
    hora_salida = Column(Time, nullable=False)
    
    # Horas requeridas (Req. #7: Registro de permanencia)
    horas_requeridas = Column(Integer, nullable=False)  # En minutos (ej: 480 = 8 horas)
    
    # Tolerancias
    tolerancia_entrada = Column(Integer, default=15)  # Minutos de tolerancia para entrada
    tolerancia_salida = Column(Integer, default=15)  # Minutos de tolerancia para salida
    
    # Estado
    activo = Column(Boolean, default=True, nullable=False)
    
    # Información adicional
    descripcion = Column(String(200), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="horarios")
    turno = relationship("Turno", back_populates="horarios")
    asistencias = relationship("Asistencia", back_populates="horario")
    
    # CONSTRAINT: Evitar duplicados exactos. Ahora la restricción incluye
    # hora_entrada y hora_salida para permitir múltiples horarios en el mismo
    # día/turno siempre que no sean idénticos.
    __table_args__ = (
        UniqueConstraint(
            'user_id', 'dia_semana', 'turno_id', 'hora_entrada', 'hora_salida',
            name='uq_user_dia_turno_horas'
        ),
    )
    
    def __repr__(self):
        return f"<Horario(user_id={self.user_id}, dia={self.dia_semana}, turno_id={self.turno_id}, entrada={self.hora_entrada})>"
    
    @property
    def horas_requeridas_formato(self) -> str:
        """Retorna horas requeridas en formato HH:MM."""
        hours = self.horas_requeridas // 60
        minutes = self.horas_requeridas % 60
        return f"{hours:02d}:{minutes:02d}"
    
    @property
    def duracion_jornada_horas(self) -> float:
        """Retorna duración de la jornada en horas decimales."""
        return round(self.horas_requeridas / 60, 2)

    def calcular_tardanza(self, hora_registro) -> int:
        """
        Calcula la tardanza en minutos comparando la hora de registro con la hora_entrada.
        Maneja turnos nocturnos donde hora_salida < hora_entrada.

        Retorna un entero >= 0 con minutos de tardanza (0 si no hay tardanza).
        """
        from datetime import datetime, timedelta

        hoy = datetime.today()
        entrada_dt = datetime.combine(hoy, self.hora_entrada)
        registro_dt = datetime.combine(hoy, hora_registro)

        # Si el horario es nocturno (salida antes que entrada) y el registro es posterior a medianoche,
        # ajustar la fecha del registro sumando un día cuando corresponda.
        if self.hora_salida < self.hora_entrada:
            # Si el registro es antes de la hora_entrada (ej: registro 01:00, entrada 22:00), asumir día siguiente
            if registro_dt.time() < self.hora_entrada:
                registro_dt = registro_dt + timedelta(days=1)
            # También puede ser necesario ajustar la entrada si la entrada está en el día anterior
            if entrada_dt.time() > self.hora_salida and entrada_dt > registro_dt:
                entrada_dt = entrada_dt - timedelta(days=1)

        diferencia = (registro_dt - entrada_dt).total_seconds() // 60
        minutos = int(diferencia) if diferencia > 0 else 0
        return minutos

    # Propiedades para serializar datos relacionados fácilmente
    @property
    def usuario_nombre(self) -> str:
        """Nombre del usuario propietario del horario (si la relación está cargada)."""
        try:
            return self.user.name if self.user else None
        except Exception:
            return None

    @property
    def usuario_email(self) -> str:
        """Email del usuario propietario del horario (si la relación está cargada)."""
        try:
            return self.user.email if self.user else None
        except Exception:
            return None

    @property
    def turno_nombre(self) -> str:
        """Nombre del turno asociado al horario (si la relación está cargada)."""
        try:
            return self.turno.nombre if self.turno else None
        except Exception:
            return None
