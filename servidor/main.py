"""
Main application entry point
FastAPI application with WebSocket, HTTP endpoints, and scheduled jobs
"""
import os

# --- Supresión temprana de logs ruidosos de TensorFlow/absl ---
# Debe ejecutarse antes de importar cualquier librería que cargue TensorFlow
# Evita: "All log messages before absl::InitializeLog() is called are written to STDERR"
# y reduce logs C++ de TensorFlow.
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')  # 0 = all, 1 = INFO, 2 = WARNING, 3 = ERROR
os.environ.setdefault('TF_FORCE_GPU_ALLOW_GROWTH', 'true')  # intenta evitar grandes asignaciones iniciales

try:
    # Intentar silenciar el aviso pre-inicialización de absl si está disponible
    from absl import logging as _absl_logging
    try:
        _absl_logging.set_verbosity(_absl_logging.ERROR)
    except Exception:
        pass
    # Función privada pero útil para evitar el warning que menciona STDERR antes de init
    try:
        _absl_logging._warn_preinit_stderr(False)
    except Exception:
        pass
except Exception:
    # absl puede no estar instalado; no es crítico
    pass

try:
    # Intentar habilitar memory growth para GPUs (reduce mensajes de OOM/allocator)
    import tensorflow as _tf
    try:
        gpus = _tf.config.list_physical_devices('GPU')
        for gpu in gpus:
            try:
                _tf.config.experimental.set_memory_growth(gpu, True)
            except Exception:
                pass
    except Exception:
        pass
except Exception:
    # TensorFlow puede no estar presente en todos los entornos; ignorar si falla
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config.settings import get_settings, ensure_directories
from src.config.database import init_db
from src.config.migrations import run_migrations_upgrade_head
# Nueva estructura modular
from src.roles import router as role_router
from src.turnos import router as turno_router
from src.notificaciones import router as notificacion_router
from src.users import router as user_router
from src.horarios import router as horario_router
from src.asistencias import router as asistencia_router
from src.justificaciones import router as justificacion_router
from src.reportes import router as reportes_router
from src.websockets.sensor_handlers import router as websocket_router
from src.jobs.scheduler import start_scheduler, shutdown_scheduler

#hacemos la importacion para arrancar los servicion del sistema de reconocimiento
from src.recognize.reconocimiento import initialize_recognizer
from src.recognize.registro import get_registration

initialize_recognizer()
get_registration()

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    print("=" * 50)
    print("🚀 Starting application...")
    
    # Ensure directories exist
    ensure_directories()
    print("✓ Directories initialized")
    
    # Apply database migrations (if AUTO_MIGRATE is enabled)
    # Set AUTO_MIGRATE=true in .env to enable automatic migrations on startup
    if settings.AUTO_MIGRATE:
        try:
            run_migrations_upgrade_head()
        except Exception as e:
            print(f"⚠ Migration error: {e}")
            print("⚠ Attempting to initialize database with create_all...")
            init_db()
    else:
        # Fallback: use SQLAlchemy's create_all (creates tables without migrations)
        init_db()
        print("✓ Database initialized (create_all mode)")
    
    # Start scheduler
    start_scheduler()
    
    print("=" * 50)
    print(f"🌐 Server running on http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"🔌 WebSocket endpoint: ws://{settings.HOST}:{settings.PORT}/ws/{{channel}}")
    print("=" * 50)
    
    yield
    
    # Shutdown
    print("\n" + "=" * 50)
    print("🛑 Shutting down application...")
    shutdown_scheduler()
    print("✓ Application stopped")
    print("=" * 50)


# Create FastAPI application
app = FastAPI(
    title="Python Server with WebSockets",
    description="A professional server with HTTP endpoints, WebSocket channels, and scheduled jobs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(role_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(turno_router, prefix="/api")
app.include_router(notificacion_router, prefix="/api")
app.include_router(asistencia_router, prefix="/api")
app.include_router(reportes_router, prefix="/api")
app.include_router(horario_router, prefix="/api")
app.include_router(justificacion_router, prefix="/api")
app.include_router(websocket_router)


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
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        ws="none"  # Disable uvicorn's WebSocket implementation, use FastAPI's native WebSocket
    )
