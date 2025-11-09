from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import sys

# ============================================================================
# CONFIGURACIÓN DE ENTORNO CRÍTICA
# ============================================================================
# Establecer TERM para evitar problemas con componentes que lo requieren
if 'TERM' not in os.environ:
    os.environ['TERM'] = 'xterm-256color'

# Configuración de TensorFlow/DeepFace ANTES de importar
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

from src.config.settings import get_settings, ensure_directories
from src.config.database import init_db
from src.config.migrations import run_migrations_upgrade_head
# Nueva estructura modular
from src.roles import router as role_router
from src.turnos import router as turno_router
from src.notificaciones import router as notificacion_router
from src.users import router as user_router
from src.auth import router as auth_router
from src.horarios import router as horario_router
from src.asistencias import router as asistencia_router
from src.justificaciones import router as justificacion_router
from src.reportes import router as reportes_router
from src.jobs.scheduler import start_scheduler, shutdown_scheduler

# Sistema de reconocimiento - SOLO se importa, NO se inicializa aquí
# La inicialización ocurre en el lifespan de la aplicación
from src.recognize.reconocimiento import initialize_recognizer
from src.recognize.registro import get_registration

settings = get_settings()


def _execute_seeds():
    """Ejecuta los seeds de inicialización de datos."""
    print("\n" + "=" * 60)
    print("🌱 Ejecutando seeds (datos iniciales)...")
    print("=" * 60)
    
    seed_errors = []
    
    # Seed de roles
    try:
        print("📋 Ejecutando seed_roles.py...")
        from seed_roles import seed_roles
        seed_roles()
        print("✅ seed_roles completado")
    except Exception as e:
        error_msg = f"seed_roles error: {e}"
        print(f"⚠️  {error_msg}")
        seed_errors.append(error_msg)
    
    # Seed de turnos
    try:
        print("🔄 Ejecutando seed_turnos.py...")
        from seed_turnos import seed_turnos
        seed_turnos()
        print("✅ seed_turnos completado")
    except Exception as e:
        error_msg = f"seed_turnos error: {e}"
        print(f"⚠️  {error_msg}")
        seed_errors.append(error_msg)
    
    # Seed de usuarios
    try:
        print("👥 Ejecutando seed_users.py...")
        from seed_users import seed_users
        seed_users()
        print("✅ seed_users completado")
    except Exception as e:
        error_msg = f"seed_users error: {e}"
        print(f"⚠️  {error_msg}")
        seed_errors.append(error_msg)
    
    print("=" * 60)
    if seed_errors:
        print("⚠️  Algunos seeds tuvieron errores (la aplicación continúa):")
        for error in seed_errors:
            print(f"  - {error}")
    else:
        print("✅ Todos los seeds ejecutados exitosamente")
    print("=" * 60 + "\n")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    print("=" * 60)
    print("🚀 Starting application...")
    print("=" * 60)
    
    # Ensure directories exist
    ensure_directories()
    print("✓ Directories initialized")
    
    # Apply database migrations (if AUTO_MIGRATE is enabled)
    # Set AUTO_MIGRATE=true in .env to enable automatic migrations on startup
    if settings.AUTO_MIGRATE:
        try:
            run_migrations_upgrade_head()
            print("✓ Database migrations applied")
        except Exception as e:
            print(f"⚠️  Migration error: {e}")
            print("⚠️  Attempting to initialize database with create_all...")
            init_db()
    else:
        # Fallback: use SQLAlchemy's create_all (creates tables without migrations)
        init_db()
        print("✓ Database initialized (create_all mode)")
    
    # ============================================================================
    # INICIALIZAR SISTEMA DE RECONOCIMIENTO FACIAL PRIMERO
    # ============================================================================
    # Esto DEBE hacerse ANTES de los seeds para evitar:
    # 1. Double-loading de modelos
    # 2. Conflictos de memoria
    # 3. Corruption de pointers
    try:
        print("\n" + "=" * 60)
        print("🔍 Initializing facial recognition system...")
        print("=" * 60)
        initialize_recognizer()
        get_registration()
        print("✅ Facial recognition system initialized successfully")
        print("=" * 60 + "\n")
    except Exception as e:
        print(f"⚠️  Warning: Facial recognition initialization failed: {e}")
        print("⚠️  Application will continue without facial recognition")
        import traceback
        print(traceback.format_exc())
    
    # ============================================================================
    # EJECUTAR SEEDS DESPUÉS de cargar modelos de ML
    # ============================================================================
    try:
        _execute_seeds()
    except Exception as e:
        print(f"⚠️  Error executing seeds: {e}")
        import traceback
        print(traceback.format_exc())
    
    # Start scheduler
    start_scheduler()
    print("✓ Scheduler started")
    
    print("=" * 60)
    print(f"🌐 Server running on http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"🔌 WebSocket endpoint: ws://{settings.HOST}:{settings.PORT}/ws/{{channel}}")
    print("=" * 60)
    
    yield
    
    # Shutdown
    print("\n" + "=" * 60)
    print("🛑 Shutting down application...")
    shutdown_scheduler()
    print("✓ Application stopped")
    print("=" * 60)


# Create FastAPI application
app = FastAPI(
    title="Python Server with WebSockets",
    description="A professional server with HTTP endpoints, WebSocket channels, and scheduled jobs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
# ✅ EN PRODUCCIÓN: especificar origen explícito, no usar ["*"] con allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),  # ✅ Obtener lista desde settings
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

print(f"\n🌐 CORS Origins configurados: {settings.get_cors_origins_list()}\n")

# Include routers
app.include_router(role_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(turno_router, prefix="/api")
app.include_router(notificacion_router, prefix="/api")
app.include_router(asistencia_router, prefix="/api")
app.include_router(reportes_router, prefix="/api")
app.include_router(horario_router, prefix="/api")
app.include_router(justificacion_router, prefix="/api")
# El router de WebSocket basado en FastAPI queda deshabilitado porque ahora se usa Socket.IO
# app.include_router(websocket_router)



# --- Socket.IO ASGI wrapper (exponer `asgi_app` para uvicorn) ---
from socketio import ASGIApp
from src.socketsio.socketio_app import sio
# Import the bridge module so the event handlers (connect/disconnect/...) register on `sio`.
# Without importing this module the decorators in `socketio_bridge.py` are not executed,
# so the server accepts socket.io connections but our handlers don't run.
from src.socketsio import socketio_bridge
asgi_app = ASGIApp(sio, other_asgi_app=app)


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Python Server API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "roles": "/api/roles",
            "users": "/api/users",
            "turnos": "/api/turnos",
            "asistencia": "/api/asistencia",
            "reportes": "/api/reportes",
            "horarios": "/api/horarios",
            "justificaciones": "/api/justificaciones",
            "websocket": "/ws/{channel}"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "scheduler": "running"
    }


if __name__ == "__main__":
    import uvicorn
    import os
    # When running `python main.py` from inside the `servidor` directory,
    # the import string "servidor.main:asgi_app" may fail because the
    # parent package is not on sys.path for the reloader subprocess.
    # To be robust we prefer to pass the ASGI app object directly when
    # possible. If DEBUG/reload is requested while running as a script,
    # the auto-reloader will spawn a subprocess that imports the module
    # by name — which will still fail in the common "cd server && python main.py"
    # case. So we disable reload in that scenario and print a helpful hint.

    # If running as a module from project root (python -m servidor.main) then
    # using the import string keeps reload working as expected.
    if settings.DEBUG and (not getattr(__package__, "__len__", lambda: 1)() or __package__ is None):
        print("⚠ DEBUG/reload requested but running as script; starting without reload.")
        print("   To enable reload use: python -m servidor.main (from project root) or: uvicorn servidor.main:asgi_app --reload")
        uvicorn.run(asgi_app, host=settings.HOST, port=settings.PORT, reload=False)
    else:
        # Prefer import string when possible so uvicorn's reloader works.
        try:
            uvicorn.run("servidor.main:asgi_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
        except Exception:
            # Fallback: run using the ASGI object directly.
            uvicorn.run(asgi_app, host=settings.HOST, port=settings.PORT, reload=False)
