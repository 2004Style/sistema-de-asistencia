"""
Módulo de detección facial.
Detecta rostros en imágenes con alta precisión usando RetinaFace.
"""
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
import cv2

from .config import (
    DETECTOR_BACKEND,
    MIN_DETECTION_CONFIDENCE,
    MIN_FACE_SIZE,
    ENFORCE_DETECTION,
    TARGET_SIZE,
    MSG_NO_FACE_DETECTED,
    MSG_MULTIPLE_FACES
)
from .utils import logger, check_image_quality, load_image


# =====================================================================
# SINGLETON PATTERN para evitar recargar modelos
# =====================================================================
_global_detector: Optional['FaceDetector'] = None


def get_detector(backend: str = None) -> 'FaceDetector':
    """
    Retorna la instancia singleton del detector facial.
    Si no existe, la crea. Si existe, la reutiliza.
    
    Args:
        backend: Backend de detección (retinaface, mtcnn, etc.)
        
    Returns:
        Instancia singleton de FaceDetector
    """
    global _global_detector
    
    backend = backend or DETECTOR_BACKEND
    
    # Si no existe o el backend cambió, crear nueva instancia
    if _global_detector is None or _global_detector.backend != backend:
        if _global_detector is not None:
            logger.info(f"♻️ Cambiando detector de {_global_detector.backend} a {backend}")
        else:
            logger.info(f"🚀 Creando detector singleton con backend: {backend}")
        
        _global_detector = FaceDetector(backend)
    else:
        logger.debug(f"✓ Reutilizando detector singleton existente ({backend})")
    
    return _global_detector


def initialize_detector(backend: str = None):
    """
    Inicializa y pre-carga el detector facial.
    Útil para servidores web que quieren cargar todo al inicio.
    
    Args:
        backend: Backend de detección a usar
    """
    detector = get_detector(backend)
    detector._load_model()
    logger.info("✅ Detector pre-cargado y listo en memoria")


def reset_detector():
    """
    Resetea el singleton (útil para testing o cambio de configuración).
    """
    global _global_detector
    _global_detector = None
    logger.info("🔄 Detector singleton reseteado")


class FaceDetector:
    """
    Clase para detección de rostros en imágenes.
    Usa DeepFace como backend que soporta múltiples detectores.
    """
    
    def __init__(self, backend: str = None):
        """
        Inicializa el detector de rostros.
        
        Args:
            backend: Detector a usar (retinaface, mtcnn, opencv, ssd)
        """
        self.backend = backend or DETECTOR_BACKEND
        self.model = None
        
        logger.info(f"Inicializando FaceDetector con backend: {self.backend}")
        
        # Cargar modelo lazy (cuando se use por primera vez)
        self._model_loaded = False
    
    def _load_model(self):
        """Carga el modelo de detección (lazy loading)."""
        if self._model_loaded:
            return
        
        try:
            # DeepFace carga modelos automáticamente
            from deepface import DeepFace
            
            # Test de carga (forzar descarga de modelos si es necesario)
            logger.info(f"Cargando modelo de detección: {self.backend}")
            
            # Crear dummy image para pre-cargar modelo
            dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
            try:
                DeepFace.extract_faces(
                    img_path=dummy_img,
                    detector_backend=self.backend,
                    enforce_detection=False
                )
            except:
                pass  # Es esperado que falle con imagen negra
            
            self._model_loaded = True
            logger.info(f"Modelo {self.backend} cargado exitosamente")
            
        except Exception as e:
            logger.error(f"Error al cargar modelo de detección: {str(e)}")
            raise
    
    def detect_faces(
        self,
        image_path: str = None,
        image: np.ndarray = None,
        return_best: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Detecta rostros en una imagen.
        
        Args:
            image_path: Ruta a la imagen (opcional)
            image: Imagen como array numpy (opcional)
            return_best: Si True, retorna solo el rostro más grande
            
        Returns:
            Lista de diccionarios con información de cada rostro detectado:
            {
                'bbox': (x, y, w, h),
                'confidence': float,
                'facial_area': dict,
                'face_img': np.ndarray
            }
        """
        self._load_model()
        
        # PASO 1: Determinar fuente de imagen y cargar si es necesario
        source_image = None  # Imagen original (numpy array)
        original_path = None  # Path original (si se proporcionó)
        
        if image_path is not None:
            # Caso 1: Se proporcionó path - cargar imagen
            source_image = load_image(image_path)
            original_path = image_path
            if source_image is None:
                return []
        elif image is not None:
            # Caso 2: Se proporcionó numpy array directamente
            source_image = image
        else:
            # Caso 3: No se proporcionó nada
            logger.error("No se proporcionó imagen válida")
            return []
        
        # PASO 2: Verificar calidad de imagen (con numpy array)
        quality_ok, quality_msg, quality_metrics = check_image_quality(source_image)
        if not quality_ok:
            logger.warning(f"Calidad de imagen: {quality_msg}")
        
        # PASO 3: CRITICAL FIX - Crear archivo temporal para DeepFace
        # DeepFace.extract_faces con numpy arrays causa KerasTensor error
        # Solución: Siempre guardar numpy array como archivo temporal PNG
        temp_file = None
        try:
            from deepface import DeepFace
            from .utils import save_image_to_temp, cleanup_temp_file
            
            # Guardar imagen como archivo temporal
            temp_file = save_image_to_temp(source_image, extension='.png')
            if temp_file is None:
                logger.error("No se pudo crear archivo temporal para detección")
                return []
            
            logger.debug(f"→ Detección usando archivo temporal: {temp_file}")
            
            # Detectar rostros usando archivo temporal (evita KerasTensor)
            face_objs = DeepFace.extract_faces(
                img_path=temp_file,  # Usar archivo temporal (NUNCA numpy array)
                detector_backend=self.backend,
                enforce_detection=False,  # No lanzar excepción si no detecta
                align=True
            )
            
            if not face_objs:
                logger.warning(MSG_NO_FACE_DETECTED)
                return []
            
            # Procesar cada rostro detectado
            detected_faces = []
            
            for face_obj in face_objs:
                facial_area = face_obj['facial_area']
                confidence = face_obj.get('confidence', 1.0)
                
                # Extraer coordenadas
                x = facial_area['x']
                y = facial_area['y']
                w = facial_area['w']
                h = facial_area['h']
                
                # Filtrar rostros muy pequeños
                if w < MIN_FACE_SIZE or h < MIN_FACE_SIZE:
                    logger.debug(f"Rostro muy pequeño ignorado: {w}x{h}")
                    continue
                
                # Filtrar por confianza si está disponible
                if confidence < MIN_DETECTION_CONFIDENCE:
                    logger.debug(f"Rostro con baja confianza ignorado: {confidence:.2f}")
                    continue
                
                # Extraer imagen del rostro
                face_img = face_obj['face']
                
                # Convertir face_img a formato uint8 si está normalizado
                if face_img.dtype == np.float32 or face_img.dtype == np.float64:
                    face_img = (face_img * 255).astype(np.uint8)
                
                # Convertir de RGB a BGR si es necesario (DeepFace retorna RGB)
                if len(face_img.shape) == 3 and face_img.shape[2] == 3:
                    face_img = cv2.cvtColor(face_img, cv2.COLOR_RGB2BGR)
                
                detected_faces.append({
                    'bbox': (x, y, w, h),
                    'confidence': confidence,
                    'facial_area': facial_area,
                    'face_img': face_img,
                    'quality_metrics': quality_metrics
                })
            
            if not detected_faces:
                logger.warning(MSG_NO_FACE_DETECTED)
                return []
            
            # Log de detección
            logger.info(f"Detectados {len(detected_faces)} rostro(s)")
            
            # Retornar solo el mejor (más grande) si se solicita
            if return_best and len(detected_faces) > 1:
                if ENFORCE_DETECTION:
                    logger.warning(MSG_MULTIPLE_FACES + " - Usando el más grande")
                
                # Encontrar el rostro más grande (por área)
                best_face = max(detected_faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
                return [best_face]
            
            return detected_faces
            
        except Exception as e:
            logger.error(f"Error en detección de rostros: {str(e)}")
            return []
        finally:
            # CRÍTICO: Limpiar archivo temporal SIEMPRE
            if temp_file:
                cleanup_temp_file(temp_file)
    
    def extract_face(
        self,
        image_path: str = None,
        image: np.ndarray = None,
        target_size: Tuple[int, int] = None
    ) -> Optional[np.ndarray]:
        """
        Detecta y extrae un solo rostro de una imagen.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            target_size: Tamaño objetivo del rostro extraído
            
        Returns:
            Imagen del rostro o None si no se detecta
        """
        faces = self.detect_faces(image_path=image_path, image=image, return_best=True)
        
        if not faces:
            return None
        
        face_img = faces[0]['face_img']
        
        # Resize si se especifica tamaño objetivo
        if target_size is not None:
            face_img = cv2.resize(face_img, target_size)
        elif face_img.shape[:2] != TARGET_SIZE:
            face_img = cv2.resize(face_img, TARGET_SIZE)
        
        return face_img
    
    def get_face_bbox(
        self,
        image_path: str = None,
        image: np.ndarray = None
    ) -> Optional[Tuple[int, int, int, int]]:
        """
        Obtiene el bounding box del rostro principal.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            
        Returns:
            Tupla (x, y, w, h) o None si no se detecta
        """
        faces = self.detect_faces(image_path=image_path, image=image, return_best=True)
        
        if not faces:
            return None
        
        return faces[0]['bbox']
    
    def has_face(
        self,
        image_path: str = None,
        image: np.ndarray = None
    ) -> bool:
        """
        Verifica si hay al menos un rostro en la imagen.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            
        Returns:
            True si hay rostro, False si no
        """
        faces = self.detect_faces(image_path=image_path, image=image, return_best=True)
        return len(faces) > 0
    
    def count_faces(
        self,
        image_path: str = None,
        image: np.ndarray = None
    ) -> int:
        """
        Cuenta el número de rostros en la imagen.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            
        Returns:
            Número de rostros detectados
        """
        faces = self.detect_faces(image_path=image_path, image=image, return_best=False)
        return len(faces)
    
    def get_detector_info(self) -> Dict[str, Any]:
        """
        Obtiene información sobre el detector.
        
        Returns:
            Diccionario con información del detector
        """
        return {
            'backend': self.backend,
            'model_loaded': self._model_loaded,
            'min_confidence': MIN_DETECTION_CONFIDENCE,
            'min_face_size': MIN_FACE_SIZE
        }


# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================
def detect_faces_batch(
    image_paths: List[str],
    detector: FaceDetector = None
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Detecta rostros en múltiples imágenes.
    
    Args:
        image_paths: Lista de rutas a imágenes
        detector: Detector a usar (usa singleton si no se proporciona)
        
    Returns:
        Diccionario {ruta_imagen: [rostros_detectados]}
    """
    if detector is None:
        detector = get_detector()  # Usar singleton
    
    results = {}
    
    for image_path in image_paths:
        logger.info(f"Procesando: {image_path}")
        faces = detector.detect_faces(image_path=image_path)
        results[image_path] = faces
    
    return results


if __name__ == "__main__":
    # Test del detector
    print("\n" + "="*60)
    print("TEST DEL DETECTOR FACIAL")
    print("="*60 + "\n")
    
    # Crear detector usando singleton
    detector = get_detector()
    print(f"✓ Detector creado: {detector.backend}")
    
    # Información del detector
    info = detector.get_detector_info()
    print(f"✓ Información del detector:")
    for key, value in info.items():
        print(f"  - {key}: {value}")
    
    print("\n✅ Detector inicializado correctamente")
    print("Para probar con imágenes reales, usa el módulo de registro o reconocimiento\n")
