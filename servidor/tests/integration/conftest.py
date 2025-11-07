"""
Fixtures para pruebas de integración.

Proporciona `client` (TestClient) usando la app de `main` con funciones pesadas
dejadas como no-op y con una base de datos SQLite en memoria por prueba.
"""
import os
import sys
import importlib
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


# Antes de importar main, parchear módulos que realizan inicializaciones pesadas
def _patch_heavy_initializers(monkeypatch):
    # Parchear inicializadores de reconocimiento y registro
    try:
        import src.recognize.reconocimiento as recog_mod
        monkeypatch.setattr(recog_mod, 'initialize_recognizer', lambda *a, **k: None)
    except Exception:
        # Si el módulo no existe o falla, ignorar
        pass

    try:
        import src.recognize.registro as registro_mod
        monkeypatch.setattr(registro_mod, 'get_registration', lambda *a, **k: None)
    except Exception:
        pass

    # Parchear scheduler para que no arranque jobs
    try:
        import src.jobs.scheduler as scheduler_mod
        monkeypatch.setattr(scheduler_mod, 'start_scheduler', lambda *a, **k: None)
        monkeypatch.setattr(scheduler_mod, 'shutdown_scheduler', lambda *a, **k: None)
    except Exception:
        pass

    # Parchear migraciones y creación de DB
    try:
        import src.config.migrations as migrations_mod
        monkeypatch.setattr(migrations_mod, 'run_migrations_upgrade_head', lambda *a, **k: None)
    except Exception:
        pass

    try:
        import src.config.database as database_mod
        monkeypatch.setattr(database_mod, 'init_db', lambda *a, **k: None)
    except Exception:
        pass


@pytest.fixture(scope="session")
def test_engine(tmp_path_factory):
    """Crea un engine SQLite en memoria compartido entre sesiones de tests"""
    db_file = tmp_path_factory.mktemp("data") / "test_db.sqlite"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    yield engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    yield SessionLocal


@pytest.fixture(scope="session")
def _prepare_app_session(tmp_path_factory, test_engine, test_session_factory):
    """Prepara la app a nivel de sesión (solo setup, sin monkeypatch)."""
    # Configurar la variable de entorno ANTES de importar main
    db_file = tmp_path_factory.mktemp("data") / "test_db.sqlite"
    os.environ['DATABASE_URL'] = f"sqlite:///{db_file}"
    
    # Patch heavy initializers before importing main
    _patch_heavy_initializers_no_monkeypatch()
    
    # Import app DESPUÉS de configurar la variable
    import main
    
    # Crear tablas en la DB de prueba
    from src.config.database import Base
    Base.metadata.create_all(bind=test_engine)
    
    # Parchear get_db a nivel global para que se use en toda la app
    import src.config.database as database_mod
    
    original_get_db = database_mod.get_db
    def get_test_db() -> Generator:
        db = test_session_factory()
        try:
            yield db
        finally:
            db.close()
    
    database_mod.get_db = get_test_db
    # También parchear en la app y dependencias
    main.app.dependency_overrides[original_get_db] = get_test_db
    
    # Crear usuarios en DB de prueba
    db = test_session_factory()
    try:
        from tests.integration.auth_helpers import create_admin_user, create_supervisor_user, create_employee_user
        from src.users.model import User
        
        # Crear usuarios predefinidos
        existing_admin = db.query(User).filter_by(email="admin@test.local").first()
        if not existing_admin:
            create_admin_user(db)
        
        existing_supervisor = db.query(User).filter_by(email="supervisor@test.local").first()
        if not existing_supervisor:
            create_supervisor_user(db)
        
        existing_employee = db.query(User).filter_by(email="employee@test.local").first()
        if not existing_employee:
            create_employee_user(db)
    except Exception as e:
        print(f"Warning: Could not set up test users: {e}")
    finally:
        db.close()
    
    return main.app


def _patch_heavy_initializers_no_monkeypatch():
    """Parchea inicializadores sin usar monkeypatch (para session scope)."""
    try:
        import src.recognize.reconocimiento as recog_mod
        recog_mod.initialize_recognizer = lambda *a, **k: None
    except Exception:
        pass2

    try:
        import src.recognize.registro as registro_mod
        registro_mod.get_registration = lambda *a, **k: None
    except Exception:
        pass

    try:
        import src.jobs.scheduler as scheduler_mod
        scheduler_mod.start_scheduler = lambda *a, **k: None
        scheduler_mod.shutdown_scheduler = lambda *a, **k: None
    except Exception:
        pass

    try:
        import src.config.migrations as migrations_mod
        migrations_mod.run_migrations_upgrade_head = lambda *a, **k: None
    except Exception:
        pass

    try:
        import src.config.database as database_mod
        database_mod.init_db = lambda *a, **k: None
    except Exception:
        pass


@pytest.fixture()
def prepare_app(monkeypatch, _prepare_app_session, test_session_factory):
    """Parchea inicializadores por fixture y usa app de sesión."""
    # Patch heavy initializers before using app
    _patch_heavy_initializers(monkeypatch)
    
    # Monkeypatch get_db dependency para usar la sesión de prueba
    import src.config.database as database_mod

    def get_test_db() -> Generator:
        db = test_session_factory()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(database_mod, 'get_db', get_test_db)
    
    # Asegurar que los usuarios existan en esta prueba
    db = test_session_factory()
    try:
        from src.users.model import User
        from tests.integration.auth_helpers import create_admin_user, create_supervisor_user, create_employee_user
        
        existing_admin = db.query(User).filter_by(email="admin@test.local").first()
        if not existing_admin:
            create_admin_user(db)
        
        existing_supervisor = db.query(User).filter_by(email="supervisor@test.local").first()
        if not existing_supervisor:
            create_supervisor_user(db)
        
        existing_employee = db.query(User).filter_by(email="employee@test.local").first()
        if not existing_employee:
            create_employee_user(db)
    except Exception as e:
        print(f"Warning: Could not ensure test users exist: {e}")
    finally:
        db.close()
    
    # Retornar la app importada
    return _prepare_app_session


@pytest.fixture()
def client(prepare_app):
    """Proporciona TestClient para la app con DB en memoria"""
    with TestClient(prepare_app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_user_and_token(_prepare_app_session, test_session_factory):
    """Proporciona usuario admin y su token de autenticación."""
    # Importar después de que todo esté inicializado (depende de _prepare_app_session)
    from src.users.model import User
    from src.utils.security import create_access_token
    
    db = test_session_factory()
    try:
        # Recuperar el usuario admin
        admin_user = db.query(User).filter_by(email="admin@test.local").first()
        if not admin_user:
            # Si no existe, crearlo
            from tests.integration.auth_helpers import create_admin_user
            create_admin_user(db)
            admin_user = db.query(User).filter_by(email="admin@test.local").first()
        
        # Generar token
        token = create_access_token(data={"sub": str(admin_user.id)})
        return admin_user, token
    finally:
        db.close()


@pytest.fixture(scope="session")
def supervisor_user_and_token(_prepare_app_session, test_session_factory):
    """Proporciona usuario supervisor y su token de autenticación."""
    from src.users.model import User
    from src.utils.security import create_access_token
    
    db = test_session_factory()
    try:
        # Recuperar el usuario supervisor
        supervisor_user = db.query(User).filter_by(email="supervisor@test.local").first()
        if not supervisor_user:
            from tests.integration.auth_helpers import create_supervisor_user
            create_supervisor_user(db)
            supervisor_user = db.query(User).filter_by(email="supervisor@test.local").first()
        
        # Generar token
        token = create_access_token(data={"sub": str(supervisor_user.id)})
        return supervisor_user, token
    finally:
        db.close()


@pytest.fixture(scope="session")
def employee_user_and_token(_prepare_app_session, test_session_factory):
    """Proporciona usuario employee y su token de autenticación."""
    from src.users.model import User
    from src.utils.security import create_access_token
    
    db = test_session_factory()
    try:
        # Recuperar el usuario employee
        employee_user = db.query(User).filter_by(email="employee@test.local").first()
        if not employee_user:
            from tests.integration.auth_helpers import create_employee_user
            create_employee_user(db)
            employee_user = db.query(User).filter_by(email="employee@test.local").first()
        
        # Generar token
        token = create_access_token(data={"sub": str(employee_user.id)})
        return employee_user, token
    finally:
        db.close()
