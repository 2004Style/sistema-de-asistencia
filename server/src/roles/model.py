"""
Role model - Sistema de gestión de roles
"""
from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from src.config.database import Base


class Role(Base):
    """
    Modelo de roles para permisos y control de acceso
    
    Roles del sistema:
    - ADMINISTRADOR: Acceso total al sistema
    - SUPERVISOR: Gestiona equipo, aprueba justificaciones
    - COLABORADOR: Usuario estándar (rol por defecto)
    - RRHH: Recursos humanos, reportes y gestión
    """
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    es_admin = Column(Boolean, default=False, nullable=False)
    puede_aprobar = Column(Boolean, default=False, nullable=False)
    puede_ver_reportes = Column(Boolean, default=False, nullable=False)
    puede_gestionar_usuarios = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    
    # Relaciones
    # Use la referencia por nombre de clase simple para evitar errores de
    # resolución cuando SQLAlchemy configure los mapeadores.
    users = relationship("User", back_populates="role")
    
    def __repr__(self):
        return f"<Role(id={self.id}, nombre='{self.nombre}')>"
    
    @classmethod
    def get_default_role_name(cls):
        """Retorna el nombre del rol por defecto"""
        return "COLABORADOR"
    
    def to_dict(self):
        """Convertir a diccionario"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "es_admin": self.es_admin,
            "puede_aprobar": self.puede_aprobar,
            "puede_ver_reportes": self.puede_ver_reportes,
            "puede_gestionar_usuarios": self.puede_gestionar_usuarios,
            "activo": self.activo
        }
