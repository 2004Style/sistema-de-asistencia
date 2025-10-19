"""
Configuración central del sistema de reconocimiento facial.
Todas las constantes y parámetros configurables están aquí.
"""
import os
from pathlib import Path
from src.config import get_settings

settings = get_settings()

# ============================================================================
# RUTAS DEL PROYECTO
# ============================================================================
BASE_DIR = Path(__file__).parent.absolute()
# Asegurar que DATA_DIR sea un Path. Si settings.UPLOAD_DIR no está definido, usar un subdirectorio por defecto.
DATA_DIR = Path(settings.UPLOAD_DIR) if getattr(settings, "UPLOAD_DIR", None) is not None else BASE_DIR / "data"
DATABASE_DIR = BASE_DIR / "database"
LOGS_DIR = BASE_DIR / "logs"

# Crear directorios si no existen — manejar casos donde el path existe pero no es directorio.
for directory in [DATA_DIR, DATABASE_DIR, LOGS_DIR]:
    directory = Path(directory)
    if directory.exists():
        if not directory.is_dir():
            # Si existe pero no es un directorio, lanzar un error claro para que el usuario lo corrija.
            raise RuntimeError(f"El path '{directory}' existe y no es un directorio. Elimine o renombre el archivo para continuar.")
        # ya existe y es directorio: nothing to do
        continue
    # crear con padres si es necesario
    directory.mkdir(parents=True, exist_ok=True)

# ============================================================================
# CONFIGURACIÓN DE MODELOS
# ============================================================================
# Modelo de detección facial (RetinaFace es el mejor)
DETECTOR_BACKEND = "retinaface"  # Opciones: retinaface, mtcnn, opencv, ssd

# Modelo de reconocimiento facial (Facenet512 es más estable y robusto)
RECOGNITION_MODEL = "Facenet512"  # Opciones: ArcFace, Facenet512, Facenet, VGG-Face

# Distancia métrica
DISTANCE_METRIC = "cosine"  # Opciones: cosine, euclidean, euclidean_l2

# ============================================================================
# PARÁMETROS DE PRECISIÓN ULTRA-ROBUSTOS
# ============================================================================
# Umbrales ajustados científicamente para máxima discriminación entre personas similares
# Basado en investigación de embeddings faciales y análisis de distribución de distancias

THRESHOLDS = {
    "ArcFace": {
        "cosine": 0.65,  # Optimizado para discriminar personas con rasgos similares
        "euclidean": 4.15,
        "euclidean_l2": 1.13
    },
    "Facenet512": {
        "cosine": 0.28,  # Más estricto para evitar confusión entre similares
        "euclidean": 23.56,
        "euclidean_l2": 1.04
    },
    "Facenet": {
        "cosine": 0.38,  # Balance entre precisión y recall
        "euclidean": 10.0,
        "euclidean_l2": 0.80
    },
    "VGG-Face": {
        "cosine": 0.38,
        "euclidean": 0.60,
        "euclidean_l2": 0.86
    }
}

# Umbral base según modelo y métrica
RECOGNITION_THRESHOLD = THRESHOLDS[RECOGNITION_MODEL][DISTANCE_METRIC]

# Umbral adaptativo para casos difíciles (se calculará dinámicamente)
USE_ADAPTIVE_THRESHOLD = True  # Ajusta según distribución de distancias en DB

# ============================================================================
# PARÁMETROS DE PROCESAMIENTO DE IMÁGENES AVANZADO
# ============================================================================
# Tamaño de imagen para normalización
TARGET_SIZE = (224, 224)

# Detectar todos los rostros (importante para contexto multi-persona)
ENFORCE_DETECTION = False  # Permite detectar múltiples rostros

# Alineación facial de 5 puntos (ojos, nariz, boca) para máxima precisión
ALIGN_FACES = True

# Preprocesamiento avanzado
ENABLE_PREPROCESSING = True  # Ecualización + denoising + normalización
ENABLE_AUGMENTATION = True   # Data augmentation en registro (flip, brightness, etc)
ENABLE_QUALITY_FILTER = True # Filtrar imágenes de muy baja calidad

# Normalizar RGB
NORMALIZATION = "base"  # Opciones: base, raw, Facenet, Facenet2018, VGGFace, ArcFace

# ============================================================================
# ESTRATEGIA DE MATCHING AVANZADA
# ============================================================================
# Estrategia híbrida: combina múltiples enfoques para máxima precisión
MATCHING_STRATEGY = "ensemble"  # ensemble, voting, min_distance, average, weighted

# Número de imágenes por persona para capturar variabilidad completa
MIN_IMAGES_PER_PERSON = 8   # Mínimo para cubrir variaciones (pose, expresión, iluminación)
RECOMMENDED_IMAGES_PER_PERSON = 12  # Óptimo para robustez
MAX_IMAGES_PER_PERSON = 20  # Máximo útil (más allá reduce rendimiento sin mejora)

# K-vecinos para voting y análisis de distribución
K_NEIGHBORS = 7  # Número impar para desempate en voting

# Weights para estrategia ensemble (suma = 1.0)
ENSEMBLE_WEIGHTS = {
    'min_distance': 0.40,    # Mayor peso: el mejor match es más confiable
    'average': 0.25,         # Considera tendencia general
    'median': 0.20,          # Robusto a outliers
    'voting': 0.15           # Consenso de vecinos cercanos
}

# Tolerancia adaptativa según contexto
BASE_VARIATION_TOLERANCE = 1.25  # Base: 25% más permisivo
ILLUMINATION_TOLERANCE = 1.35    # Iluminación extrema: 35% más permisivo
OCCLUSION_TOLERANCE = 1.40       # Oclusiones (lentes, barba): 40% más permisivo
POSE_TOLERANCE = 1.30            # Ángulos diferentes: 30% más permisivo

# ============================================================================
# VALIDACIÓN Y CALIDAD MULTI-NIVEL
# ============================================================================
# Confianza mínima en detección (ajustado para balance precisión/recall)
MIN_DETECTION_CONFIDENCE = 0.65  # Balance óptimo

# Tamaño mínimo de rostro en pixels
MIN_FACE_SIZE = 50  # Detecta rostros lejanos pero mantiene calidad mínima

# Control de calidad multinivel
CHECK_IMAGE_QUALITY = True
QUALITY_STRICTNESS = "medium"  # strict, medium, lenient

# Umbrales de calidad según strictness
QUALITY_THRESHOLDS = {
    "strict": {
        "blur": 120,      # Laplacian variance
        "brightness_min": 50,
        "brightness_max": 200,
        "contrast_min": 30
    },
    "medium": {
        "blur": 80,
        "brightness_min": 30,
        "brightness_max": 220,
        "contrast_min": 20
    },
    "lenient": {
        "blur": 50,
        "brightness_min": 15,
        "brightness_max": 240,
        "contrast_min": 10
    }
}

# Usar threshold según strictness
MAX_BLUR_THRESHOLD = QUALITY_THRESHOLDS[QUALITY_STRICTNESS]["blur"]

# ============================================================================
# ARCHIVOS DE BASE DE DATOS
# ============================================================================
EMBEDDINGS_FILE = DATABASE_DIR / "embeddings.pkl"
METADATA_FILE = DATABASE_DIR / "metadata.json"
FACE_DATABASE_FILE = DATABASE_DIR / "face_database.pkl"

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FILE = LOGS_DIR / "face_recognition.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# ============================================================================
# PERFORMANCE
# ============================================================================
# Usar GPU si está disponible (requiere CUDA)
USE_GPU = False  # Cambiar a True si tienes GPU NVIDIA

# Número de workers para procesamiento paralelo
NUM_WORKERS = 4

# Batch size para procesamiento de múltiples imágenes
BATCH_SIZE = 32

# ============================================================================
# VISUALIZACIÓN
# ============================================================================
# Colores para dibujar boxes (BGR format para OpenCV)
COLOR_RECOGNIZED = (0, 255, 0)  # Verde
COLOR_UNKNOWN = (0, 0, 255)      # Rojo
COLOR_BOX = (255, 255, 0)        # Cyan

# Grosor de líneas
BOX_THICKNESS = 2
TEXT_THICKNESS = 2

# Tamaño de fuente
FONT_SCALE = 0.8

# ============================================================================
# CONFIGURACIÓN AVANZADA
# ============================================================================
# Anti-spoofing (detección de fotos de fotos)
ENABLE_ANTI_SPOOFING = False  # Requiere modelos adicionales

# Face landmarks para mayor precisión
EXTRACT_LANDMARKS = True

# Guardar embeddings en formato comprimido
COMPRESS_EMBEDDINGS = True

# Cache de modelos en memoria
CACHE_MODELS = True

# ============================================================================
# MENSAJES Y TEXTOS
# ============================================================================
MSG_NO_FACE_DETECTED = "No se detectó ningún rostro en la imagen"
MSG_MULTIPLE_FACES = "Se detectaron múltiples rostros"
MSG_LOW_QUALITY = "Imagen de baja calidad"
MSG_UNKNOWN_PERSON = "Persona desconocida"
MSG_SUCCESS_REGISTRATION = "Persona registrada exitosamente"
MSG_SUCCESS_RECOGNITION = "Persona reconocida"

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================
def get_threshold(model=None, metric=None):
    """Obtener umbral óptimo para modelo y métrica específicos."""
    model = model or RECOGNITION_MODEL
    metric = metric or DISTANCE_METRIC
    return THRESHOLDS.get(model, {}).get(metric, 0.40)


def get_model_info():
    """Retornar información de configuración del modelo."""
    return {
        "detector": DETECTOR_BACKEND,
        "recognizer": RECOGNITION_MODEL,
        "distance_metric": DISTANCE_METRIC,
        "threshold": RECOGNITION_THRESHOLD,
        "target_size": TARGET_SIZE,
        "gpu_enabled": USE_GPU
    }


# ============================================================================
# VALIDACIÓN DE CONFIGURACIÓN
# ============================================================================
def validate_config():
    """Validar que la configuración es correcta."""
    errors = []
    
    if RECOGNITION_MODEL not in THRESHOLDS:
        errors.append(f"Modelo {RECOGNITION_MODEL} no soportado")
    
    if DISTANCE_METRIC not in ["cosine", "euclidean", "euclidean_l2"]:
        errors.append(f"Métrica {DISTANCE_METRIC} no válida")
    
    if not 0 < RECOGNITION_THRESHOLD < 2:
        errors.append(f"Umbral {RECOGNITION_THRESHOLD} fuera de rango")
    
    if MIN_IMAGES_PER_PERSON < 1:
        errors.append("MIN_IMAGES_PER_PERSON debe ser >= 1")
    
    if errors:
        raise ValueError(f"Errores en configuración: {', '.join(errors)}")
    
    return True


# Validar al importar
validate_config()
