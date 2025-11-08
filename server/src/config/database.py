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

# Lazy initialization of engine and SessionLocal
_engine = None
_SessionLocal = None

# Base class for models
Base = declarative_base()


def get_engine():
    """Get or create the SQLAlchemy engine (lazy initialization)"""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
    return _engine


def get_session_local():
    """Get or create the SessionLocal factory (lazy initialization)"""
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


# For backwards compatibility with existing code that imports SessionLocal directly
def _get_session_local_for_import():
    """Get SessionLocal lazily for backwards compatibility"""
    return get_session_local()

# Create a property-like behavior for backwards compatibility
class _SessionLocalProxy:
    """Lazy proxy for SessionLocal to maintain backwards compatibility"""
    def __call__(self, *args, **kwargs):
        return get_session_local()(*args, **kwargs)

SessionLocal = _SessionLocalProxy()


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
    try:
        # Importar modelos para crear tablas
        from src.roles.model import Role
        from src.turnos.model import Turno
        from src.notificaciones.model import Notificacion, TipoNotificacion, PrioridadNotificacion
        from src.users.model import User
        from src.horarios.model import Horario, DiaSemana
        from src.asistencias.model import Asistencia, TipoRegistro, EstadoAsistencia, MetodoRegistro
        from src.justificaciones.model import Justificacion, TipoJustificacion, EstadoJustificacion
        
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
        logging.getLogger(__name__).info("✓ Database tables initialized successfully")
    except Exception as e:
        logging.getLogger(__name__).warning(f"⚠ Could not initialize database: {e}")
        logging.getLogger(__name__).warning("⚠ Database will be initialized on first use")
