"""
Modelo de Usuario.

Define la estructura de datos para usuarios en el sistema,
incluyendo relaciones con roles, horarios, asistencias y notificaciones.
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from src.base_model import BaseModel


class User(BaseModel):
    """
    Modelo de Usuario del sistema.
    
    Atributos:
        id: Identificador único del usuario
        name: Nombre completo del usuario
        email: Correo electrónico (único)
        codigo_user: Código único del usuario
        password: Contraseña encriptada
        role_id: ID del rol asignado
        is_active: Estado del usuario (activo/inactivo)
        huella: Huella digital del usuario (opcional, se registra posteriormente)
        
    Relaciones:
        role: Rol asignado al usuario
        horarios: Horarios del usuario
        asistencias: Registros de asistencia
        justificaciones: Justificaciones presentadas
        notificaciones: Notificaciones recibidas
        
    Propiedades computadas:
        es_admin: Indica si el usuario es administrador
        puede_aprobar: Indica si puede aprobar justificaciones
        puede_ver_reportes: Indica si puede ver reportes
        puede_gestionar_usuarios: Indica si puede gestionar usuarios
    """
    __tablename__ = "users"
    
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    codigo_user = Column(String(20), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    huella = Column(String(500), nullable=True)
    
    # Relaciones
    # Use la referencia por nombre de clase simple para evitar errores de
    # resolución cuando SQLAlchemy configure los mapeadores.
    role = relationship("Role", back_populates="users")
    horarios = relationship("Horario", back_populates="user", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="user", cascade="all, delete-orphan")
    justificaciones = relationship("Justificacion", foreign_keys="Justificacion.user_id", back_populates="user", cascade="all, delete-orphan")
    notificaciones = relationship("Notificacion", back_populates="user", cascade="all, delete-orphan")
    
    @property
    def es_admin(self) -> bool:
        """Verifica si el usuario tiene rol de administrador."""
        return self.role.nombre.lower() == "administrador" if self.role else False
    
    @property
    def puede_aprobar(self) -> bool:
        """Verifica si el usuario puede aprobar justificaciones."""
        # El atributo en Role se llama `puede_aprobar`.
        return self.role.puede_aprobar if self.role else False
    
    @property
    def puede_ver_reportes(self) -> bool:
        """Verifica si el usuario puede ver reportes."""
        return self.role.puede_ver_reportes if self.role else False
    
    @property
    def puede_gestionar_usuarios(self) -> bool:
        """Verifica si el usuario puede gestionar otros usuarios."""
        return self.role.puede_gestionar_usuarios if self.role else False
    
    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}', codigo='{self.codigo_user}')>"
