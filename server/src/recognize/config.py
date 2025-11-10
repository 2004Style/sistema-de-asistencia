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
# CONFIGURACIÓN DE MODELOS - MÁXIMA POTENCIA Y ROBUSTEZ
# ============================================================================
# Modelo de detección facial (RetinaFace es el mejor y más robusto)
DETECTOR_BACKEND = "retinaface"  # El más potente: maneja múltiples poses, oclusiones, baja luz

# Modelo de reconocimiento facial (Facenet512 - mayor dimensionalidad = mejor precisión)
RECOGNITION_MODEL = "Facenet512"  # 512 dimensiones - máxima capacidad discriminativa

# Distancia métrica (cosine es más robusta para embeddings normalizados)
DISTANCE_METRIC = "cosine"  # Más estable ante variaciones de iluminación

# ============================================================================
# PARÁMETROS DE PRECISIÓN ULTRA-ROBUSTOS
# ============================================================================
# Umbrales ajustados científicamente para MÁXIMA discriminación entre personas similares
# CRÍTICO: Evitar confusión entre gemelos, hermanos, personas con rasgos parecidos
# Basado en investigación de embeddings faciales y análisis de distribución de distancias

THRESHOLDS = {
    "ArcFace": {
        "cosine": 0.60,  # Más estricto - evita confusión entre similares
        "euclidean": 4.15,
        "euclidean_l2": 1.13
    },
    "Facenet512": {
        "cosine": 0.25,  # MUY ESTRICTO - solo acepta matches muy cercanos
        # Facenet512 con 512 dimensiones permite discriminación fina
        # 0.25 = solo ~15° de ángulo en espacio embedding
        "euclidean": 23.56,
        "euclidean_l2": 1.04
    },
    "Facenet": {
        "cosine": 0.35,  # Más estricto que default
        "euclidean": 10.0,
        "euclidean_l2": 0.80
    },
    "VGG-Face": {
        "cosine": 0.35,  # Más estricto
        "euclidean": 0.60,
        "euclidean_l2": 0.86
    }
}

# Umbral base según modelo y métrica
RECOGNITION_THRESHOLD = THRESHOLDS[RECOGNITION_MODEL][DISTANCE_METRIC]

# UMBRAL ADAPTATIVO - Ajusta dinámicamente según contexto PERO mantiene discriminación
USE_ADAPTIVE_THRESHOLD = True  # Calcula threshold óptimo por cada persona en DB

# ============================================================================
# PARÁMETROS DE PROCESAMIENTO DE IMÁGENES - ULTRA POTENTE
# ============================================================================
# Tamaño de imagen para normalización (mayor = más detalles preservados)
TARGET_SIZE = (224, 224)  # Óptimo para Facenet512

# Detectar todos los rostros (para análisis de contexto)
ENFORCE_DETECTION = False  # Permite procesamiento flexible

# Alineación facial de 5 puntos - CRÍTICO para precisión
ALIGN_FACES = True  # Normaliza pose, rotación, escala

# PREPROCESAMIENTO ULTRA-AGRESIVO - Funciona con CUALQUIER calidad
ENABLE_PREPROCESSING = True   # 6 técnicas de mejora (CLAHE, denoising, sharpening, etc)
ENABLE_AUGMENTATION = True    # 8 variaciones por imagen en registro = máxima robustez
ENABLE_QUALITY_FILTER = False # DESACTIVADO - el preprocesamiento se encarga de todo

# Normalización RGB adaptativa
NORMALIZATION = "base"  # Compatible con todos los modelos

# ============================================================================
# ESTRATEGIA DE MATCHING ULTRA-AVANZADA - MÁXIMA PRECISIÓN Y ROBUSTEZ
# ============================================================================
# Estrategia ensemble: combina 4 técnicas para decisión óptima
MATCHING_STRATEGY = "ensemble"  # La más potente: promedio ponderado de múltiples métricas

# Número de imágenes por persona - OPTIMIZADO para capturar variabilidad completa
# CRÍTICO: Más imágenes = mejor discriminación entre similares + robustez ante cambios
MIN_IMAGES_PER_PERSON = 8     # Mínimo para cobertura básica (antes 5)
RECOMMENDED_IMAGES_PER_PERSON = 12  # ÓPTIMO - cubre todas las variaciones (antes 10)
                                    # - Diferentes poses (frontal, 3/4, perfil)
                                    # - Diferentes expresiones (neutral, sonrisa)
                                    # - Diferentes luces (natural, artificial)
                                    # - Con/sin lentes, diferentes peinados
MAX_IMAGES_PER_PERSON = 20    # Máximo útil - más allá es redundante (antes 15)

# Con 12 imágenes + augmentation (8 variaciones cada una) = 96 embeddings
# Esto permite discriminación muy fina entre personas similares

# K-vecinos para voting y análisis (impar para desempate)
K_NEIGHBORS = 5  # Reducido a 5 - más rápido y suficientemente robusto

# ENSEMBLE WEIGHTS OPTIMIZADOS - Balanceados para discriminación fina
ENSEMBLE_WEIGHTS = {
    'min_distance': 0.50,    # MÁXIMA prioridad al mejor match (↑ de 0.45)
    'average': 0.20,         # Reduce peso de promedio (puede incluir outliers)
    'median': 0.20,          # Mantiene robustez ante outliers
    'voting': 0.10           # Consenso secundario
}

# TOLERANCIAS ADAPTATIVAS INTELIGENTES
# ⚠️ CRÍTICO: Estas tolerancias aplican SOLO si el contexto lo detecta
# NO relajan el umbral base - solo compensan cuando hay razón específica

BASE_VARIATION_TOLERANCE = 1.15   # Base: solo 15% más permisivo (antes 1.30)
                                  # Mantiene discriminación entre personas similares

# Tolerancias contextuales - SOLO si se detecta el problema específico
ILLUMINATION_TOLERANCE = 1.40     # Si detecta cambio drástico de luz (antes 1.50)
                                  # Ej: foto en oficina vs exterior
                                  
OCCLUSION_TOLERANCE = 1.35        # Si detecta lentes/barba/accesorios (antes 1.45)
                                  # Permite cambios de look del mismo individuo
                                  
POSE_TOLERANCE = 1.25             # Si detecta ángulo diferente (antes 1.35)
                                  # Ej: foto frontal vs perfil

# NUEVO: Configuración de variabilidad intra-persona
ALLOW_INTRA_PERSON_VARIABILITY = True  # Tolera cambios del mismo individuo
REJECT_INTER_PERSON_SIMILARITY = True  # Rechaza personas similares

# Mínima separación entre personas en embedding space
MIN_INTER_PERSON_DISTANCE = 0.35  # Si dos personas están más cerca que esto, 
                                  # requiere confianza EXTRA alta para distinguir

# ============================================================================
# VALIDACIÓN Y CALIDAD - CONFIGURACIÓN ULTRA-ROBUSTA Y ADAPTATIVA
# ============================================================================
# Confianza mínima en detección - BALANCEADA para alta/baja calidad
MIN_DETECTION_CONFIDENCE = 0.55  # Óptimo: detecta en condiciones difíciles sin falsos positivos

# Tamaño mínimo de rostro - ADAPTATIVO
MIN_FACE_SIZE = 35  # Mínimo para mantener calidad útil de embeddings

# SISTEMA DE VALIDACIÓN ADAPTATIVO - NO rechaza, solo advierte y compensa
CHECK_IMAGE_QUALITY = True  # Activo para logging y métricas, NO para rechazo
QUALITY_STRICTNESS = "adaptive"  # NUEVO: Se adapta automáticamente a la calidad disponible

# UMBRALES MULTI-NIVEL - El preprocesamiento compensa cualquier calidad
QUALITY_THRESHOLDS = {
    "strict": {  # Para producción con cámaras profesionales
        "blur": 120,
        "brightness_min": 50,
        "brightness_max": 200,
        "contrast_min": 30
    },
    "medium": {  # Para cámaras web estándar
        "blur": 60,
        "brightness_min": 25,
        "brightness_max": 225,
        "contrast_min": 15
    },
    "lenient": {  # Para cámaras de laptop
        "blur": 20,  # Acepta casi cualquier nivel (preprocesamiento compensará)
        "brightness_min": 5,   # Extremadamente permisivo
        "brightness_max": 250, # Acepta sobreexposición
        "contrast_min": 5      # Mínimo absoluto
    },
    "adaptive": {  # NUEVO - Se ajusta dinámicamente
        "blur": 15,  # No rechaza por blur - sharpening lo arregla
        "brightness_min": 3,   # Casi sin mínimo
        "brightness_max": 252, # Casi sin máximo
        "contrast_min": 3      # Preprocesamiento aumentará contraste
    }
}

# Usar threshold según strictness
MAX_BLUR_THRESHOLD = QUALITY_THRESHOLDS[QUALITY_STRICTNESS]["blur"]

# ============================================================================
# ANTI-CONFUSIÓN: DETECCIÓN DE PERSONAS SIMILARES
# ============================================================================
# Sistema para evitar confusión entre personas con rasgos parecidos
ENABLE_SIMILARITY_CHECK = True  # Analiza similitud entre personas registradas

# Si dos personas registradas tienen embeddings muy cercanos, aumenta umbral
SIMILARITY_WARNING_THRESHOLD = 0.35  # Si distancia < 0.35, son MUY similares
SIMILARITY_CRITICAL_THRESHOLD = 0.25 # Si distancia < 0.25, casi idénticas (gemelos)

# Ajuste de umbral cuando hay personas similares en DB
SIMILARITY_STRICTNESS_MULTIPLIER = 0.85  # Reduce threshold 15% (más estricto)
                                         # Ej: threshold 0.25 → 0.21 con personas similares

# ============================================================================
# ROBUSTEZ ANTE CAMBIOS INTRA-PERSONA
# ============================================================================
# Sistema para tolerar cambios del mismo individuo sin confundir con otros
INTRA_PERSON_VARIANCE_TOLERANCE = 0.18  # Variación normal dentro de una persona
                                        # Cambios de peinado, lentes, barba, etc.

# Confidence boost para variaciones conocidas
KNOWN_VARIATION_CONFIDENCE_BOOST = 1.15  # +15% confianza si match está dentro
                                         # de variabilidad esperada de esa persona

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
