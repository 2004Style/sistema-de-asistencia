"""
Módulo de utilidades para el sistema de reconocimiento facial.
Incluye funciones de logging, validación, preprocesamiento y visualización.
"""
import os
import cv2
import numpy as np
import logging
from pathlib import Path
from typing import Tuple, Optional, List, Dict, Any
from datetime import datetime
import json

from .config import (
    LOG_FILE, LOG_FORMAT, LOG_LEVEL,
    MIN_FACE_SIZE, MAX_BLUR_THRESHOLD, CHECK_IMAGE_QUALITY,
    COLOR_RECOGNIZED, COLOR_UNKNOWN, BOX_THICKNESS, TEXT_THICKNESS, FONT_SCALE
)


# ============================================================================
# CONFIGURACIÓN DE LOGGING
# ============================================================================
def setup_logger(name: str = "FaceRecognition") -> logging.Logger:
    """
    Configura y retorna un logger para el sistema.
    
    Args:
        name: Nombre del logger
        
    Returns:
        Logger configurado
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, LOG_LEVEL))
    
    # Evitar duplicar handlers
    if logger.handlers:
        return logger
    
    # Handler para archivo
    file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(LOG_FORMAT)
    file_handler.setFormatter(file_formatter)
    
    # Handler para consola
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, LOG_LEVEL))
    console_formatter = logging.Formatter('%(levelname)s - %(message)s')
    console_handler.setFormatter(console_formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


# Logger global
logger = setup_logger()


# ============================================================================
# VALIDACIÓN DE IMÁGENES
# ============================================================================
def validate_image_path(image_path: str) -> Tuple[bool, str]:
    """
    Valida que la ruta de imagen sea válida y exista.
    
    Args:
        image_path: Ruta a la imagen
        
    Returns:
        Tupla (válido, mensaje)
    """
    if not image_path:
        return False, "Ruta de imagen vacía"
    
    path = Path(image_path)
    
    if not path.exists():
        return False, f"La imagen no existe: {image_path}"
    
    if not path.is_file():
        return False, f"La ruta no es un archivo: {image_path}"
    
    valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    if path.suffix.lower() not in valid_extensions:
        return False, f"Formato de imagen no soportado: {path.suffix}"
    
    return True, "Imagen válida"


def load_image(image_path: str) -> Optional[np.ndarray]:
    """
    Carga una imagen desde disco con validación.
    
    Args:
        image_path: Ruta a la imagen
        
    Returns:
        Imagen como array numpy o None si falla
    """
    valid, message = validate_image_path(image_path)
    if not valid:
        logger.error(message)
        return None
    
    try:
        image = cv2.imread(str(image_path))
        if image is None:
            logger.error(f"No se pudo leer la imagen: {image_path}")
            return None
        
        logger.debug(f"Imagen cargada: {image_path} - Shape: {image.shape}")
        return image
    
    except Exception as e:
        logger.error(f"Error al cargar imagen {image_path}: {str(e)}")
        return None


def check_image_quality(image: np.ndarray) -> Tuple[bool, str, Dict[str, float]]:
    """
    Verifica la calidad de una imagen (blur, brillo, contraste).
    
    Args:
        image: Imagen como array numpy
        
    Returns:
        Tupla (es_buena_calidad, mensaje, métricas)
    """
    if not CHECK_IMAGE_QUALITY:
        return True, "Validación de calidad deshabilitada", {}
    
    metrics = {}
    issues = []
    
    try:
        # Convertir a escala de grises si es necesario
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # 1. Verificar blur (usando varianza del Laplaciano)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        metrics['blur_score'] = laplacian_var
        
        if laplacian_var < MAX_BLUR_THRESHOLD:
            issues.append(f"Imagen borrosa (score: {laplacian_var:.2f})")
        
        # 2. Verificar brillo
        brightness = np.mean(gray)
        metrics['brightness'] = brightness
        
        if brightness < 40:
            issues.append(f"Imagen muy oscura (brillo: {brightness:.2f})")
        elif brightness > 220:
            issues.append(f"Imagen muy brillante (brillo: {brightness:.2f})")
        
        # 3. Verificar contraste
        contrast = gray.std()
        metrics['contrast'] = contrast
        
        if contrast < 20:
            issues.append(f"Bajo contraste (contraste: {contrast:.2f})")
        
        # 4. Verificar tamaño mínimo
        height, width = gray.shape
        metrics['width'] = width
        metrics['height'] = height
        
        if width < MIN_FACE_SIZE or height < MIN_FACE_SIZE:
            issues.append(f"Imagen muy pequeña ({width}x{height})")
        
        if issues:
            return False, " | ".join(issues), metrics
        
        return True, "Imagen de buena calidad", metrics
    
    except Exception as e:
        logger.error(f"Error al verificar calidad: {str(e)}")
        return True, f"Error en validación: {str(e)}", {}


# ============================================================================
# PROCESAMIENTO DE IMÁGENES
# ============================================================================
def preprocess_face(face_img: np.ndarray, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Preprocesa una imagen de rostro para mejorar la calidad.
    Aplica ecualización adaptativa, reducción de ruido y normalización.
    
    Args:
        face_img: Imagen del rostro
        target_size: Tamaño objetivo
        
    Returns:
        Imagen preprocesada
    """
    try:
        # Resize si es necesario
        if face_img.shape[:2] != target_size:
            face_img = cv2.resize(face_img, target_size, interpolation=cv2.INTER_CUBIC)
        
        # Ecualización adaptativa (CLAHE) para iluminación no uniforme
        if len(face_img.shape) == 3:
            # Convertir a LAB color space para mejor ecualización
            lab = cv2.cvtColor(face_img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # CLAHE en canal L (luminancia)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge y convertir de vuelta
            lab = cv2.merge([l, a, b])
            face_img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        else:
            # Para escala de grises
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            face_img = clahe.apply(face_img)
        
        # Reducción de ruido adaptativa
        face_img = cv2.fastNlMeansDenoisingColored(face_img, None, 10, 10, 7, 21)
        
        # Sharpening suave para mejorar detalles
        kernel = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]]) / 9
        face_img = cv2.filter2D(face_img, -1, kernel)
        
        return face_img
    
    except Exception as e:
        logger.error(f"Error en preprocesamiento: {str(e)}")
        # Fallback: al menos resize
        if face_img.shape[:2] != target_size:
            return cv2.resize(face_img, target_size)
        return face_img


def augment_face_image(face_img: np.ndarray) -> List[np.ndarray]:
    """
    Genera variaciones augmentadas de una imagen de rostro.
    Útil para registro: crea múltiples variaciones para mejorar robustez.
    
    Augmentations aplicadas:
    - Flip horizontal
    - Ajustes de brillo (+/- 15%)
    - Ajustes de contraste (+/- 15%)
    - Rotación suave (+/- 5 grados)
    
    Args:
        face_img: Imagen del rostro original
        
    Returns:
        Lista de imágenes augmentadas (incluye original)
    """
    augmented = [face_img.copy()]  # Original
    
    try:
        h, w = face_img.shape[:2]
        
        # 1. Flip horizontal (espejo)
        flipped = cv2.flip(face_img, 1)
        augmented.append(flipped)
        
        # 2. Brillo aumentado (+15%)
        bright = cv2.convertScaleAbs(face_img, alpha=1.0, beta=30)
        augmented.append(bright)
        
        # 3. Brillo reducido (-15%)
        dark = cv2.convertScaleAbs(face_img, alpha=1.0, beta=-30)
        augmented.append(dark)
        
        # 4. Contraste aumentado
        high_contrast = cv2.convertScaleAbs(face_img, alpha=1.15, beta=0)
        augmented.append(high_contrast)
        
        # 5. Contraste reducido
        low_contrast = cv2.convertScaleAbs(face_img, alpha=0.85, beta=0)
        augmented.append(low_contrast)
        
        # 6. Rotación +5 grados
        M_rot_pos = cv2.getRotationMatrix2D((w/2, h/2), 5, 1.0)
        rotated_pos = cv2.warpAffine(face_img, M_rot_pos, (w, h))
        augmented.append(rotated_pos)
        
        # 7. Rotación -5 grados
        M_rot_neg = cv2.getRotationMatrix2D((w/2, h/2), -5, 1.0)
        rotated_neg = cv2.warpAffine(face_img, M_rot_neg, (w, h))
        augmented.append(rotated_neg)
        
        logger.debug(f"Generadas {len(augmented)} variaciones augmentadas")
        
    except Exception as e:
        logger.error(f"Error en augmentation: {str(e)}")
    
    return augmented


def normalize_face(face_img: np.ndarray) -> np.ndarray:
    """
    Normaliza una imagen de rostro (0-255 -> 0-1).
    
    Args:
        face_img: Imagen del rostro
        
    Returns:
        Imagen normalizada
    """
    return face_img.astype(np.float32) / 255.0


# ============================================================================
# VISUALIZACIÓN
# ============================================================================
def draw_face_box(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    label: str,
    confidence: float,
    is_recognized: bool = True
) -> np.ndarray:
    """
    Dibuja un cuadro alrededor del rostro con etiqueta.
    
    Args:
        image: Imagen donde dibujar
        bbox: Coordenadas (x, y, w, h)
        label: Etiqueta de la persona
        confidence: Confianza del reconocimiento
        is_recognized: Si fue reconocido o desconocido
        
    Returns:
        Imagen con el cuadro dibujado
    """
    x, y, w, h = bbox
    color = COLOR_RECOGNIZED if is_recognized else COLOR_UNKNOWN
    
    # Dibujar rectángulo
    cv2.rectangle(image, (x, y), (x + w, y + h), color, BOX_THICKNESS)
    
    # Preparar texto
    text = f"{label} ({confidence:.2%})" if is_recognized else label
    
    # Calcular tamaño del texto para el fondo
    (text_width, text_height), baseline = cv2.getTextSize(
        text, cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE, TEXT_THICKNESS
    )
    
    # Dibujar fondo del texto
    cv2.rectangle(
        image,
        (x, y - text_height - baseline - 10),
        (x + text_width, y),
        color,
        -1
    )
    
    # Dibujar texto
    cv2.putText(
        image,
        text,
        (x, y - baseline - 5),
        cv2.FONT_HERSHEY_SIMPLEX,
        FONT_SCALE,
        (255, 255, 255),
        TEXT_THICKNESS
    )
    
    return image


def save_annotated_image(image: np.ndarray, output_path: str) -> bool:
    """
    Guarda una imagen anotada en disco.
    
    Args:
        image: Imagen a guardar
        output_path: Ruta de salida
        
    Returns:
        True si se guardó correctamente
    """
    try:
        cv2.imwrite(output_path, image)
        logger.info(f"Imagen anotada guardada en: {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error al guardar imagen: {str(e)}")
        return False


# ============================================================================
# MANEJO DE DIRECTORIOS
# ============================================================================
def get_person_images(data_dir: Path, person_name: str) -> List[str]:
    """
    Obtiene todas las imágenes de una persona desde su carpeta.
    
    Args:
        data_dir: Directorio raíz de datos
        person_name: Nombre de la persona
        
    Returns:
        Lista de rutas a imágenes
    """
    person_dir = data_dir / person_name
    
    if not person_dir.exists():
        logger.warning(f"Directorio no encontrado: {person_dir}")
        return []
    
    valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    images = []
    
    for ext in valid_extensions:
        images.extend(person_dir.glob(f"*{ext}"))
        images.extend(person_dir.glob(f"*{ext.upper()}"))
    
    return [str(img) for img in sorted(images)]


def get_all_persons(data_dir: Path) -> List[str]:
    """
    Obtiene la lista de todas las personas en el directorio de datos.
    
    Args:
        data_dir: Directorio raíz de datos
        
    Returns:
        Lista de nombres de personas
    """
    if not data_dir.exists():
        logger.warning(f"Directorio de datos no encontrado: {data_dir}")
        return []
    
    persons = [
        d.name for d in data_dir.iterdir()
        if d.is_dir() and not d.name.startswith('.')
    ]
    
    return sorted(persons)


# ============================================================================
# DISTANCIAS Y SIMILITUDES
# ============================================================================
def calculate_distance(embedding1: np.ndarray, embedding2: np.ndarray, metric: str = "cosine") -> float:
    """
    Calcula la distancia entre dos embeddings.
    
    Args:
        embedding1: Primer embedding
        embedding2: Segundo embedding
        metric: Métrica a usar (cosine, euclidean, euclidean_l2)
        
    Returns:
        Distancia entre embeddings
    """
    if metric == "cosine":
        # Similitud coseno normalizada a distancia [0, 1]
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        similarity = dot_product / (norm1 * norm2)
        distance = 1 - similarity
        return distance
    
    elif metric == "euclidean":
        # Distancia euclidiana
        return np.linalg.norm(embedding1 - embedding2)
    
    elif metric == "euclidean_l2":
        # Distancia euclidiana con embeddings L2-normalizados
        emb1_norm = embedding1 / np.linalg.norm(embedding1)
        emb2_norm = embedding2 / np.linalg.norm(embedding2)
        return np.linalg.norm(emb1_norm - emb2_norm)
    
    else:
        raise ValueError(f"Métrica no soportada: {metric}")


# ============================================================================
# PERSISTENCIA
# ============================================================================
def save_json(data: Dict[str, Any], filepath: Path) -> bool:
    """
    Guarda datos en formato JSON.
    
    Args:
        data: Datos a guardar
        filepath: Ruta del archivo
        
    Returns:
        True si se guardó correctamente
    """
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error al guardar JSON: {str(e)}")
        return False


def load_json(filepath: Path) -> Optional[Dict[str, Any]]:
    """
    Carga datos desde un archivo JSON.
    
    Args:
        filepath: Ruta del archivo
        
    Returns:
        Datos cargados o None si falla
    """
    try:
        if not filepath.exists():
            return None
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error al cargar JSON: {str(e)}")
        return None


# ============================================================================
# UTILIDADES GENERALES
# ============================================================================
def get_timestamp() -> str:
    """Retorna timestamp actual en formato legible."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def format_confidence(confidence: float) -> str:
    """Formatea un valor de confianza como porcentaje."""
    return f"{confidence * 100:.2f}%"


def print_banner(text: str, char: str = "=") -> None:
    """Imprime un banner decorativo."""
    length = len(text) + 4
    print(f"\n{char * length}")
    print(f"  {text}  ")
    print(f"{char * length}\n")


def create_directory_structure(base_dir: Path) -> None:
    """
    Crea la estructura de directorios completa del proyecto.
    
    Args:
        base_dir: Directorio base del proyecto
    """
    directories = [
        base_dir / "data",
        base_dir / "database",
        base_dir / "models",
        base_dir / "test_images",
        base_dir / "logs",
        base_dir / "results"
    ]
    
    for directory in directories:
        directory.mkdir(exist_ok=True, parents=True)
        logger.debug(f"Directorio creado/verificado: {directory}")


# ============================================================================
# ESTADÍSTICAS
# ============================================================================
def calculate_statistics(distances: List[float]) -> Dict[str, float]:
    """
    Calcula estadísticas de una lista de distancias.
    
    Args:
        distances: Lista de distancias
        
    Returns:
        Diccionario con estadísticas
    """
    if not distances:
        return {}
    
    return {
        "min": float(np.min(distances)),
        "max": float(np.max(distances)),
        "mean": float(np.mean(distances)),
        "median": float(np.median(distances)),
        "std": float(np.std(distances))
    }


if __name__ == "__main__":
    # Test de utilidades
    print_banner("TEST DE UTILIDADES")
    
    logger.info("Logger inicializado correctamente")
    
    # Test de validación de imagen
    test_path = "/tmp/test.jpg"
    valid, msg = validate_image_path(test_path)
    print(f"Validación de imagen: {valid} - {msg}")
    
    # Test de cálculo de distancia
    emb1 = np.random.rand(512)
    emb2 = np.random.rand(512)
    
    for metric in ["cosine", "euclidean", "euclidean_l2"]:
        dist = calculate_distance(emb1, emb2, metric)
        print(f"Distancia {metric}: {dist:.4f}")
    
    print("\n✅ Utilidades funcionando correctamente")
