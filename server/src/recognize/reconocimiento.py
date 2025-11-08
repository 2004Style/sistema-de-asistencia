"""
Módulo de reconocimiento facial.
Identifica personas en imágenes comparando con la base de datos de embeddings.
"""
import numpy as np
import cv2
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from .config import (
    RECOGNITION_MODEL,
    DISTANCE_METRIC,
    RECOGNITION_THRESHOLD,
    MATCHING_STRATEGY,
    K_NEIGHBORS,
    MSG_UNKNOWN_PERSON,
    MSG_SUCCESS_RECOGNITION,
    MSG_NO_FACE_DETECTED,
    ENSEMBLE_WEIGHTS,
    USE_ADAPTIVE_THRESHOLD,
    BASE_VARIATION_TOLERANCE,
    ILLUMINATION_TOLERANCE,
    OCCLUSION_TOLERANCE,
    ENABLE_PREPROCESSING
)

# Importar VARIATION_TOLERANCE si existe
try:
    from .config import VARIATION_TOLERANCE
except ImportError:
    VARIATION_TOLERANCE = BASE_VARIATION_TOLERANCE  # Usar base si no está definida
from .utils import (
    logger,
    calculate_distance,
    load_image,
    draw_face_box,
    format_confidence,
    get_timestamp,
    calculate_statistics,
    preprocess_face,
    save_annotated_image
)
from .detector import get_detector, initialize_detector, FaceDetector  # Usar get_detector singleton
from .registro import get_registration  # Usar singleton del registro de embeddings


class FaceRecognizer:
    """
    Clase para reconocer personas en imágenes usando la base de datos de embeddings.
    """
    
    def __init__(self):
        """Inicializa el reconocedor facial."""
        # Usar detector singleton en lugar de crear nueva instancia
        self.detector = get_detector()
        # Usar el singleton de registro para compartir la misma base de embeddings
        self.registration = get_registration()
        # Mantener referencia directa a la misma estructura de datos
        self.database = self.registration.database
        
        if not self.database:
            logger.warning("Base de datos vacía. Registra personas primero.")
        else:
            logger.info(f"Reconocedor inicializado con {len(self.database)} personas")
    
    def _extract_embedding(
        self,
        image_path: str = None,
        image: np.ndarray = None
    ) -> Tuple[Optional[np.ndarray], Dict[str, Any]]:
        """
        Extrae embedding con preprocesamiento avanzado y análisis de contexto.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            
        Returns:
            Tupla (embedding, context_hints)
            context_hints contiene información sobre calidad de imagen que ayuda
            al matching adaptativo
        """
        from deepface import DeepFace
        
        context_hints = {}
        
        try:
            # Verificar que hay rostro
            if not self.detector.has_face(image_path=image_path, image=image):
                logger.warning(MSG_NO_FACE_DETECTED)
                return None, context_hints
            
            # Detectar rostro y obtener info
            face_data = self.detector.detect_faces(
                image_path=image_path,
                image=image,
                return_best=True
            )
            
            if not face_data:
                return None, context_hints
            
            face_img = face_data[0]['face_img']
            quality_metrics = face_data[0].get('quality_metrics', {})
            
            # Analizar contexto de la imagen
            if quality_metrics:
                # Detectar iluminación baja/alta
                brightness = quality_metrics.get('brightness', 128)
                if brightness < 60:
                    context_hints['low_illumination'] = True
                elif brightness > 200:
                    context_hints['high_illumination'] = True
                
                # Detectar blur
                blur_score = quality_metrics.get('blur_score', 100)
                if blur_score < 100:
                    context_hints['slightly_blurred'] = True
            
            # TODO: Detectar oclusiones (lentes, barba, etc) usando landmarks
            # Por ahora, asumir que puede haber oclusiones
            context_hints['has_occlusions'] = False  # Implementar detección futura
            
            # Preprocesamiento avanzado
            if ENABLE_PREPROCESSING:
                logger.debug("Aplicando preprocesamiento avanzado...")
                face_img = preprocess_face(face_img)
            
            # Extraer embedding
            if image_path is not None and not ENABLE_PREPROCESSING:
                img_source = image_path
            else:
                img_source = face_img
            
            embedding_obj = DeepFace.represent(
                img_path=img_source,
                model_name=RECOGNITION_MODEL,
                detector_backend='skip' if ENABLE_PREPROCESSING else self.detector.backend,
                enforce_detection=not ENABLE_PREPROCESSING,
                align=True
            )
            
            # Extraer array del embedding
            if isinstance(embedding_obj, list):
                embedding = np.array(embedding_obj[0]['embedding'])
            else:
                embedding = np.array(embedding_obj['embedding'])
            
            return embedding, context_hints
        
        except Exception as e:
            logger.error(f"Error al extraer embedding: {str(e)}")
            return None, context_hints
    
    def _compare_with_database(
        self,
        query_embedding: np.ndarray,
        context_hints: Dict[str, Any] = None
    ) -> Tuple[Optional[str], float, Dict[str, Any]]:
        """
        Sistema de matching ULTRA-AVANZADO con estrategia ensemble.
        
        Combina múltiples técnicas para máxima precisión:
        1. Min distance: Mejor match individual
        2. Average: Tendencia general
        3. Median: Robusto a outliers
        4. Voting: Consenso de k-vecinos
        5. Weighted ensemble: Combinación ponderada
        6. Adaptive threshold: Ajusta según distribución y contexto
        
        Args:
            query_embedding: Embedding a comparar
            context_hints: Hints de contexto (illumination_quality, has_occlusions, etc.)
            
        Returns:
            Tupla (nombre_persona, confianza, detalles)
        """
        if not self.database:
            logger.warning("Base de datos vacía")
            return None, 0.0, {}
        
        context_hints = context_hints or {}
        all_distances = {}
        
        # Calcular distancias con todas las personas
        for person_name, person_embeddings in self.database.items():
            distances = []
            
            for person_embedding in person_embeddings:
                distance = calculate_distance(
                    query_embedding,
                    person_embedding,
                    metric=DISTANCE_METRIC
                )
                distances.append(distance)
            
            all_distances[person_name] = distances
        
        # ===================================================================
        # ESTRATEGIA ENSEMBLE: Combinar múltiples enfoques
        # ===================================================================
        person_scores_ensemble = {}
        
        # 1. MIN DISTANCE (mejor match individual)
        scores_min = {name: np.min(dists) for name, dists in all_distances.items()}
        
        # 2. AVERAGE (tendencia general)
        scores_avg = {name: np.mean(dists) for name, dists in all_distances.items()}
        
        # 3. MEDIAN (robusto a outliers)
        scores_median = {name: np.median(dists) for name, dists in all_distances.items()}
        
        # 4. VOTING (k-vecinos)
        all_dists_flat = []
        for name, dists in all_distances.items():
            for dist in dists:
                all_dists_flat.append((name, dist))
        all_dists_flat.sort(key=lambda x: x[1])
        
        votes = {}
        for name, dist in all_dists_flat[:K_NEIGHBORS]:
            votes[name] = votes.get(name, 0) + 1
        
        scores_voting = {}
        for name in all_distances.keys():
            if name in votes:
                name_dists = [d for n, d in all_dists_flat[:K_NEIGHBORS] if n == name]
                scores_voting[name] = np.mean(name_dists)
            else:
                scores_voting[name] = float('inf')
        
        # 5. ENSEMBLE COMBINADO (ponderado)
        if MATCHING_STRATEGY == "ensemble":
            for name in all_distances.keys():
                ensemble_score = (
                    ENSEMBLE_WEIGHTS['min_distance'] * scores_min[name] +
                    ENSEMBLE_WEIGHTS['average'] * scores_avg[name] +
                    ENSEMBLE_WEIGHTS['median'] * scores_median[name] +
                    ENSEMBLE_WEIGHTS['voting'] * scores_voting[name]
                )
                person_scores_ensemble[name] = ensemble_score
            
            person_scores = person_scores_ensemble
            strategy_used = "ensemble"
        
        elif MATCHING_STRATEGY == "voting":
            person_scores = scores_voting
            strategy_used = "voting"
        
        elif MATCHING_STRATEGY == "min_distance":
            person_scores = scores_min
            strategy_used = "min_distance"
        
        elif MATCHING_STRATEGY == "average":
            person_scores = scores_avg
            strategy_used = "average"
        
        elif MATCHING_STRATEGY == "weighted":
            # Weighted: más peso a min, menos a avg
            for name in all_distances.keys():
                person_scores[name] = 0.6 * scores_min[name] + 0.4 * scores_avg[name]
            strategy_used = "weighted"
        
        else:
            # Fallback: ensemble
            person_scores = scores_avg
            strategy_used = "average (fallback)"
        
        # Encontrar mejor match
        best_name = min(person_scores.keys(), key=lambda k: person_scores[k])
        best_distance = person_scores[best_name]
        
        # ===================================================================
        # ADAPTIVE THRESHOLD: Ajustar según contexto y distribución
        # ===================================================================
        base_threshold = RECOGNITION_THRESHOLD
        tolerance_factor = BASE_VARIATION_TOLERANCE
        
        # Ajustar por contexto
        if context_hints.get('low_illumination'):
            tolerance_factor = max(tolerance_factor, ILLUMINATION_TOLERANCE)
        
        if context_hints.get('has_occlusions'):  # lentes, barba, etc
            tolerance_factor = max(tolerance_factor, OCCLUSION_TOLERANCE)
        
        # Adaptive threshold basado en distribución de distancias en DB
        if USE_ADAPTIVE_THRESHOLD and len(all_distances) > 1:
            # Calcular separación entre mejor y segundo mejor
            sorted_scores = sorted(person_scores.values())
            if len(sorted_scores) >= 2:
                best_score = sorted_scores[0]
                second_best_score = sorted_scores[1]
                separation_ratio = second_best_score / (best_score + 1e-10)
                
                # Si hay buena separación, ser menos estricto
                if separation_ratio > 1.5:  # Mejor es 50% menor que segundo
                    tolerance_factor *= 1.1
        
        adjusted_threshold = base_threshold * tolerance_factor
        
        # ===================================================================
        # CALCULAR CONFIANZA
        # ===================================================================
        if DISTANCE_METRIC == "cosine":
            # Cosine: 0-2 (típicamente 0-1)
            confidence = max(0, min(1, 1 - best_distance))
        else:
            # Euclidean: normalizar según modelo
            if RECOGNITION_MODEL == "Facenet512":
                confidence = max(0, 1 - (best_distance / 25))
            elif RECOGNITION_MODEL == "ArcFace":
                confidence = max(0, 1 - (best_distance / 2))
            else:
                confidence = max(0, 1 - (best_distance / 10))
        
        # Verificar reconocimiento
        recognized = best_distance < adjusted_threshold
        
        # Zona gris: muy cerca del umbral
        margin = 0.05 * adjusted_threshold
        if not recognized and best_distance < (adjusted_threshold + margin):
            # Verificar separación: si el mejor es significativamente mejor que el resto
            sorted_scores = sorted(person_scores.values())
            if len(sorted_scores) >= 2:
                second_best = sorted_scores[1]
                if second_best > best_distance * 1.3:  # 30% peor
                    recognized = True
                    confidence *= 0.9  # Penalizar ligeramente
        
        # ===================================================================
        # DETALLES PARA ANÁLISIS
        # ===================================================================
        details = {
            'distance': float(best_distance),
            'threshold': base_threshold,
            'adjusted_threshold': float(adjusted_threshold),
            'tolerance_factor': float(tolerance_factor),
            'recognized': recognized,
            'confidence_raw': float(confidence),
            'strategy': strategy_used,
            'metric': DISTANCE_METRIC,
            'context_hints': context_hints,
            'all_scores': {
                'min_distance': {name: float(s) for name, s in scores_min.items()},
                'average': {name: float(s) for name, s in scores_avg.items()},
                'median': {name: float(s) for name, s in scores_median.items()},
                'voting': {name: float(s) for name, s in scores_voting.items()}
            },
            'all_distances': {
                name: {
                    'final_score': float(person_scores[name]),
                    'distances': [float(d) for d in all_distances[name]],
                    'statistics': calculate_statistics(all_distances[name])
                }
                for name in all_distances.keys()
            }
        }
        
        if not recognized:
            return None, confidence, details
        
        return best_name, confidence, details
    
    def recognize(
        self,
        image_path: str = None,
        image: np.ndarray = None,
        return_details: bool = False
    ) -> Dict[str, Any]:
        """
        Reconoce una persona en una imagen.
        
        Args:
            image_path: Ruta a la imagen
            image: Imagen como array numpy
            return_details: Si True, incluye detalles de todas las comparaciones
            
        Returns:
            Diccionario con resultado del reconocimiento:
            {
                'recognized': bool,
                'person': str o None,
                'confidence': float,
                'distance': float,
                'timestamp': str,
                'details': dict (opcional)
            }
        """
        logger.info(f"\n{'='*60}")
        logger.info("Iniciando reconocimiento facial")
        logger.info(f"{'='*60}")
        
        result = {
            'recognized': False,
            'person': None,
            'confidence': 0.0,
            'distance': float('inf'),
            'timestamp': get_timestamp()
        }
        
        # Extraer embedding de la imagen query
        logger.info("Extrayendo embedding de la imagen...")
        query_embedding, context_hints = self._extract_embedding(image_path=image_path, image=image)
        
        if query_embedding is None:
            logger.error("No se pudo extraer embedding de la imagen")
            result['error'] = "No se detectó rostro o error al procesar"
            return result
        
        logger.info(f"✓ Embedding extraído: dimensión {query_embedding.shape}")
        if context_hints:
            logger.debug(f"Context hints: {context_hints}")
        
        # Comparar con base de datos (con context hints)
        logger.info(f"Comparando con {len(self.database)} personas en la base de datos...")
        person_name, confidence, details = self._compare_with_database(query_embedding, context_hints)
        
        # Actualizar resultado
        if person_name is not None:
            result['recognized'] = True
            result['person'] = person_name
            result['confidence'] = confidence
            result['distance'] = details['distance']
            
            logger.info(f"\n{MSG_SUCCESS_RECOGNITION}!")
            logger.info(f"Persona: {person_name}")
            logger.info(f"Confianza: {format_confidence(confidence)}")
            logger.info(f"Distancia: {details['distance']:.4f}")
        else:
            logger.info(f"\n{MSG_UNKNOWN_PERSON}")
            logger.info(f"Mejor match: {list(self.database.keys())[0]} (distancia: {details['distance']:.4f})")
            logger.info(f"Umbral requerido: {RECOGNITION_THRESHOLD:.4f}")
        
        if return_details:
            result['details'] = details
        
        logger.info(f"{'='*60}\n")
        
        return result


# ============================================================================
# SINGLETON PATTERN - Para servidores web y mejor rendimiento
# ============================================================================

# Instancia global que se inicializa UNA SOLA VEZ
_global_recognizer: Optional[FaceRecognizer] = None


def get_recognizer() -> FaceRecognizer:
    """
    Obtiene la instancia global del reconocedor (Singleton).
    Se inicializa la primera vez y se reutiliza después.
    
    ⚡ OPTIMIZACIÓN: El modelo se carga UNA VEZ al inicio y permanece en memoria.
    Ideal para servidores web donde se hacen múltiples reconocimientos.
    
    Returns:
        Instancia compartida de FaceRecognizer
    """
    global _global_recognizer
    
    if _global_recognizer is None:
        logger.info("🚀 Inicializando reconocedor facial (primera vez)...")
        _global_recognizer = FaceRecognizer()
        logger.info("✅ Reconocedor cargado y listo en memoria")
    
    return _global_recognizer


def initialize_recognizer() -> FaceRecognizer:
    """
    Pre-inicializa el reconocedor Y el detector al inicio del programa/servidor.
    
    ⭐ RECOMENDADO: Llamar esta función al arrancar el servidor web
    para cargar TODOS los modelos antes de recibir peticiones.
    
    Esto pre-carga:
    - Modelo de detección facial (RetinaFace/MTCNN/etc.)
    - Modelo de reconocimiento (Facenet512)
    - Base de datos de embeddings
    
    Ejemplo:
        # Al inicio del servidor (main.py, app.py, etc.)
        from reconocimiento import initialize_recognizer
        
        print("⏳ Cargando modelos...")
        initialize_recognizer()
        print("✅ Todo listo!")
    
    Returns:
        Instancia del reconocedor
    """
    import sys
    
    # SAFETY: Verificar si ya está inicializado para evitar doble carga
    global _global_recognizer
    if _global_recognizer is not None:
        logger.info("ℹ️ Reconocedor ya estaba inicializado, reutilizando instancia")
        return _global_recognizer
    
    # Inicializar optimizaciones de memoria ANTES de cargar los modelos
    try:
        from .memory_cleanup import initialize_memory_optimization, cleanup_tensorflow, full_cleanup
        initialize_memory_optimization()
    except Exception as e:
        logger.warning(f"Memory optimization setup failed: {e}")
        cleanup_tensorflow = None
        full_cleanup = None
    
    try:
        # Pre-cargar detector facial
        logger.info("📸 Pre-cargando detector facial...")
        initialize_detector()
        
        # Limpiar memoria después de cargar el detector
        try:
            if cleanup_tensorflow:
                cleanup_tensorflow()
        except Exception as e:
            logger.warning(f"TensorFlow cleanup failed: {e}")
        
        # Pre-cargar reconocedor (que usa el detector singleton)
        logger.info("🧠 Pre-cargando reconocedor facial...")
        recognizer = get_recognizer()
        
        # Limpiar memoria después de cargar el reconocedor
        try:
            if full_cleanup:
                full_cleanup()
        except Exception as e:
            logger.warning(f"Full cleanup failed: {e}")
        
        logger.info("✅ Sistema completamente inicializado y listo")
        return recognizer
        
    except Exception as e:
        logger.error(f"❌ Error durante inicialización: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise


def reset_recognizer():
    """
    Resetea la instancia global (útil para testing o recargar base de datos).
    La próxima llamada a get_recognizer() creará una nueva instancia.
    """
    global _global_recognizer
    _global_recognizer = None
    logger.info("♻️ Reconocedor reseteado")


# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================
def quick_recognize(image_path: str, show: bool = False) -> Dict[str, Any]:
    """
    Función rápida para reconocer una persona en una imagen.
    
    ⚡ USA SINGLETON: No recarga el modelo, usa la instancia en memoria.
    Primera llamada: ~4 segundos (carga modelo + reconocimiento)
    Llamadas siguientes: ~0.8 segundos (solo reconocimiento)
    
    Args:
        image_path: Ruta a la imagen
        show: Si True, muestra resultado visualmente
        
    Returns:
        Diccionario con resultado
    """
    recognizer = get_recognizer()  # ← Usa instancia global (rápido!)
    return recognizer.recognize(image_path=image_path)


if __name__ == "__main__":
    from utils import print_banner
    
    # Test del reconocedor
    print_banner("TEST DEL SISTEMA DE RECONOCIMIENTO")
    
    # Crear instancia
    recognizer = FaceRecognizer()
    
    # Mostrar información
    if recognizer.database:
        print(f"Base de datos cargada con {len(recognizer.database)} personas:")
        for person in recognizer.database.keys():
            num_embeddings = len(recognizer.database[person])
            print(f"  - {person}: {num_embeddings} embeddings")
        
        print("\n✅ Sistema de reconocimiento listo para usar")
        print("Usa recognize(image_path) para reconocer personas\n")
    else:
        print("⚠️  Base de datos vacía")
        print("Registra personas primero usando el módulo de registro\n")
