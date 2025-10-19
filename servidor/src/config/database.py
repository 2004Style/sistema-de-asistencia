"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from src.config.settings import get_settings
import logging

# Silenciar logs de SQLAlchemy por defecto (evita que las consultas SQL se impriman en INFO)
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy').setLevel(logging.WARNING)

settings = get_settings()

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection for database sessions.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    # Importar modelos para crear tablas
    from src.roles.model import Role
    from src.turnos.model import Turno
    from src.notificaciones.model import Notificacion, TipoNotificacion, PrioridadNotificacion
    from src.users.model import User
    from src.horarios.model import Horario, DiaSemana
    from src.asistencias.model import Asistencia, TipoRegistro, EstadoAsistencia, MetodoRegistro
    from src.justificaciones.model import Justificacion, TipoJustificacion, EstadoJustificacion
    Base.metadata.create_all(bind=engine)
