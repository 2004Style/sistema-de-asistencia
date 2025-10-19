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


@pytest.fixture()
def prepare_app(monkeypatch, test_engine, test_session_factory):
    """Parchea inicializadores y prepara la app sin efectos secundarios."""
    # Patch heavy initializers before importing main
    _patch_heavy_initializers(monkeypatch)

    # Import app after patches
    import main

    # Crear tablas en la DB de prueba
    from src.config.database import Base
    Base.metadata.create_all(bind=test_engine)

    # Monkeypatch get_db dependency para usar la sesión de prueba
    import src.config.database as database_mod

    def get_test_db() -> Generator:
        db = test_session_factory()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(database_mod, 'get_db', get_test_db)

    # Crear usuario admin para tests que lo requieran
    db = test_session_factory()
    try:
        from src.roles.model import Role
        from src.users.model import User
        from passlib.context import CryptContext
        
        # Verificar si ya existe un admin
        existing_admin = db.query(User).join(Role).filter(Role.es_admin == True).first()
        if not existing_admin:
            # Crear role admin
            admin_role = db.query(Role).filter(Role.es_admin == True).first()
            if not admin_role:
                admin_role = Role(
                    nombre="Admin",
                    es_admin=True,
                    descripcion="Administrador del sistema"
                )
                db.add(admin_role)
                db.commit()
            
            # Crear usuario admin
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hashed_pwd = pwd_context.hash("admin123")
            admin_user = User(
                name="Admin User",
                email="admin@test.local",
                codigo_user="ADMIN001",
                password=hashed_pwd,
                role_id=admin_role.id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    except Exception as e:
        # Si hay error, ignorar (fixture de DB ya creó tablas)
        pass
    finally:
        db.close()

    # Retornar la app importada
    return main.app


@pytest.fixture()
def client(prepare_app):
    """Proporciona TestClient para la app con DB en memoria"""
    with TestClient(prepare_app) as c:
        yield c
