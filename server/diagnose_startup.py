#!/usr/bin/env python3
"""
Script de diagnóstico para verificar problemas de inicio del servidor.
Ejecutar: python diagnose_startup.py
"""
import os
import sys
import gc
import psutil
from pathlib import Path

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_status(title, status, details=""):
    """Imprime estado con color."""
    icon = f"{GREEN}✓{RESET}" if status else f"{RED}✗{RESET}"
    print(f"{icon} {title}: {details}")

def check_environment():
    """Verifica variables de entorno críticas."""
    print(f"\n{BLUE}═══ VARIABLES DE ENTORNO ═══{RESET}")
    
    critical_vars = {
        'DATABASE_URL': 'Base de datos',
        'TERM': 'Terminal (para output)',
        'PYTHONUNBUFFERED': 'Python unbuffered I/O'
    }
    
    for var, desc in critical_vars.items():
        value = os.environ.get(var, "NO CONFIGURADA")
        status = var in os.environ
        print_status(desc, status, value[:50] if len(str(value)) > 50 else value)

def check_dependencies():
    """Verifica si las dependencias críticas están instaladas."""
    print(f"\n{BLUE}═══ DEPENDENCIAS ═══{RESET}")
    
    dependencies = {
        'fastapi': 'FastAPI',
        'sqlalchemy': 'SQLAlchemy',
        'psycopg2': 'PostgreSQL Driver',
        'deepface': 'DeepFace (Facial Recognition)',
        'tensorflow': 'TensorFlow (ML)',
        'cv2': 'OpenCV (Image Processing)',
    }
    
    for module, name in dependencies.items():
        try:
            __import__(module)
            print_status(name, True, f"({module})")
        except ImportError as e:
            print_status(name, False, f"({module}) - {e}")

def check_database():
    """Verifica conectividad a base de datos."""
    print(f"\n{BLUE}═══ BASE DE DATOS ═══{RESET}")
    
    db_url = os.environ.get('DATABASE_URL', '')
    print_status("DATABASE_URL configurada", bool(db_url), db_url[:50] if db_url else "NO CONFIGURADA")
    
    if db_url:
        try:
            from sqlalchemy import create_engine, text
            engine = create_engine(db_url, echo=False, pool_pre_ping=True)
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                print_status("Conexión a PostgreSQL", True, "Exitosa")
        except Exception as e:
            print_status("Conexión a PostgreSQL", False, str(e)[:100])

def check_directories():
    """Verifica directorios necesarios."""
    print(f"\n{BLUE}═══ DIRECTORIOS ═══{RESET}")
    
    dirs = {
        'src/recognize/database': 'Base de datos de embeddings',
        'src/recognize/logs': 'Logs del reconocimiento',
        'public/temp': 'Archivos temporales',
        'public/reports': 'Reportes',
    }
    
    for dir_path, desc in dirs.items():
        full_path = Path(dir_path)
        exists = full_path.exists()
        is_dir = exists and full_path.is_dir()
        status_str = "EXISTS" if is_dir else ("EXISTS BUT NOT DIR" if exists else "MISSING")
        print_status(desc, is_dir, f"{dir_path} - {status_str}")

def check_models():
    """Verifica modelos de ML."""
    print(f"\n{BLUE}═══ MODELOS DE ML ═══{RESET}")
    
    try:
        from pathlib import Path
        cache_dir = Path.home() / '.deepface' / 'weights'
        models = {
            'retinaface.h5': 'RetinaFace (Detector)',
            'facenet512_weights.h5': 'Facenet512 (Recognizer)',
        }
        
        print_status("Cache dir DeepFace", cache_dir.exists(), str(cache_dir))
        
        if cache_dir.exists():
            for model_file, desc in models.items():
                model_path = cache_dir / model_file
                exists = model_path.exists()
                size = f"{model_path.stat().st_size / 1e6:.1f}MB" if exists else "N/A"
                print_status(desc, exists, f"{model_file} - {size}")
    except Exception as e:
        print_status("Verificar modelos", False, str(e))

def check_memory():
    """Verifica memoria disponible."""
    print(f"\n{BLUE}═══ MEMORIA ═══{RESET}")
    
    try:
        mem = psutil.virtual_memory()
        percent = mem.percent
        available_gb = mem.available / 1e9
        total_gb = mem.total / 1e9
        
        status = percent < 80
        print_status("Memoria disponible", status, f"{available_gb:.1f}GB / {total_gb:.1f}GB ({percent:.1f}%)")
    except Exception as e:
        print_status("Información de memoria", False, str(e))

def check_tensorflow_config():
    """Verifica configuración de TensorFlow."""
    print(f"\n{BLUE}═══ TENSORFLOW/DEEPFACE ═══{RESET}")
    
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices('GPU')
        print_status("GPUs disponibles", len(gpus) > 0, f"{len(gpus)} GPU(s) detectada(s)")
        
        print_status("TF_CPP_MIN_LOG_LEVEL", 'TF_CPP_MIN_LOG_LEVEL' in os.environ, 
                     os.environ.get('TF_CPP_MIN_LOG_LEVEL', 'NO SET'))
    except Exception as e:
        print_status("Verificar TensorFlow", False, str(e)[:100])

def main():
    """Ejecuta todos los chequeos."""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{YELLOW}DIAGNÓSTICO DE INICIO DEL SERVIDOR{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    check_environment()
    check_dependencies()
    check_database()
    check_directories()
    check_models()
    check_memory()
    check_tensorflow_config()
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{YELLOW}FIN DEL DIAGNÓSTICO{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

if __name__ == "__main__":
    main()
