"""
Módulo de registro de personas.
Permite registrar nuevas personas en el sistema con sus imágenes de referencia.
Extrae y almacena los embeddings faciales.
"""
import numpy as np
import pickle
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from .config import (
    DATA_DIR,
    EMBEDDINGS_FILE,
    METADATA_FILE,
    RECOGNITION_MODEL,
    DISTANCE_METRIC,
    MIN_IMAGES_PER_PERSON,
    MAX_IMAGES_PER_PERSON,
    COMPRESS_EMBEDDINGS,
    MSG_SUCCESS_REGISTRATION,
    ENABLE_PREPROCESSING,
    ENABLE_AUGMENTATION
)
from .utils import (
    logger,
    get_person_images,
    get_all_persons,
    save_json,
    load_json,
    get_timestamp,
    print_banner,
    preprocess_face,
    augment_face_image,
    load_image
)
from .detector import get_detector, FaceDetector  # Usar detector singleton


# =====================================================================
# SINGLETON PATTERN para FaceRegistration
# =====================================================================
_global_registration: Optional['FaceRegistration'] = None


def get_registration() -> 'FaceRegistration':
    """
    Retorna la instancia singleton del sistema de registro.
    Si no existe, la crea. Si existe, la reutiliza.
    
    Returns:
        Instancia singleton de FaceRegistration
    """
    global _global_registration
    
    if _global_registration is None:
        logger.info("🚀 Creando sistema de registro singleton")
        _global_registration = FaceRegistration()
    else:
        logger.debug("✓ Reutilizando sistema de registro singleton")
    
    return _global_registration


def reset_registration():
    """
    Resetea el singleton del registro (útil para testing o recargar BD).
    """
    global _global_registration
    _global_registration = None
    logger.info("🔄 Sistema de registro singleton reseteado")


class FaceRegistration:
    """
    Clase para registrar personas en el sistema de reconocimiento facial.
    """
    
    def __init__(self):
        """Inicializa el sistema de registro."""
        # Usar detector singleton en lugar de crear nueva instancia
        self.detector = get_detector()
        self.database = self._load_database()
        self.metadata = self._load_metadata()
        
        logger.info("Sistema de registro inicializado")
    
    def _load_database(self) -> Dict[str, List[np.ndarray]]:
        """
        Carga la base de datos de embeddings desde disco.
        
        Returns:
            Diccionario {nombre_persona: [embeddings]}
        """
        if not EMBEDDINGS_FILE.exists():
            logger.info("No existe base de datos previa, creando nueva")
            return {}
        
        try:
            with open(EMBEDDINGS_FILE, 'rb') as f:
                database = pickle.load(f)
            
            logger.info(f"Base de datos cargada: {len(database)} personas")
            return database
        
        except Exception as e:
            logger.error(f"Error al cargar base de datos: {str(e)}")
            return {}
    
    def _save_database(self) -> bool:
        """
        Guarda la base de datos de embeddings en disco.
        
        Returns:
            True si se guardó correctamente
        """
        try:
            # Crear directorio si no existe
            EMBEDDINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            
            # Guardar con compresión si está habilitado
            protocol = pickle.HIGHEST_PROTOCOL if COMPRESS_EMBEDDINGS else pickle.DEFAULT_PROTOCOL
            
            with open(EMBEDDINGS_FILE, 'wb') as f:
                pickle.dump(self.database, f, protocol=protocol)
            
            logger.info(f"Base de datos guardada: {EMBEDDINGS_FILE}")
            return True
        
        except Exception as e:
            logger.error(f"Error al guardar base de datos: {str(e)}")
            return False
    
    def _load_metadata(self) -> Dict[str, Any]:
        """
        Carga metadata del sistema.
        
        Returns:
            Diccionario con metadata
        """
        metadata = load_json(METADATA_FILE)
        
        if metadata is None:
            metadata = {
                'persons': {},
                'model': RECOGNITION_MODEL,
                'distance_metric': DISTANCE_METRIC,
                'created_at': get_timestamp(),
                'last_updated': get_timestamp()
            }
        
        return metadata
    
    def _save_metadata(self) -> bool:
        """
        Guarda metadata del sistema.
        
        Returns:
            True si se guardó correctamente
        """
        self.metadata['last_updated'] = get_timestamp()
        return save_json(self.metadata, METADATA_FILE)
    
    def _extract_embeddings(self, image_paths: List[str], use_augmentation: bool = True) -> List[np.ndarray]:
        """
        Extrae embeddings de imágenes con preprocesamiento y augmentation opcionales.
        
        Estrategia multi-embedding:
        1. Preprocesa cada imagen (CLAHE, denoising, sharpening)
        2. Si augmentation activo: genera variaciones (flip, brightness, contrast, rotation)
        3. Extrae embeddings de todas las variaciones
        4. Resultado: embeddings más robustos que capturan variabilidad
        
        Args:
            image_paths: Lista de rutas a imágenes
            use_augmentation: Si True, genera variaciones augmentadas
            
        Returns:
            Lista de embeddings extraídos (puede ser > len(image_paths) si hay augmentation)
        """
        from deepface import DeepFace
        
        embeddings = []
        total_processed = 0
        
        for i, image_path in enumerate(image_paths, 1):
            logger.info(f"Procesando imagen {i}/{len(image_paths)}: {Path(image_path).name}")
            
            try:
                # Cargar y verificar imagen
                img = load_image(image_path)
                if img is None:
                    logger.warning(f"  ✗ No se pudo cargar: {image_path}")
                    continue
                
                # Verificar que hay rostro
                if not self.detector.has_face(image=img):
                    logger.warning(f"  ✗ No se detectó rostro en: {image_path}")
                    continue
                
                # Extraer rostro detectado
                face_data = self.detector.detect_faces(image=img, return_best=True)
                if not face_data:
                    continue
                
                face_img = face_data[0]['face_img']
                
                # Preprocesamiento avanzado
                if ENABLE_PREPROCESSING:
                    logger.debug("  → Aplicando preprocesamiento avanzado...")
                    face_img = preprocess_face(face_img)
                
                # Lista de imágenes a procesar (original + augmentaciones)
                images_to_process = [face_img]
                
                # Data augmentation para mayor robustez
                if use_augmentation and ENABLE_AUGMENTATION:
                    logger.debug("  → Generando variaciones augmentadas...")
                    augmented_imgs = augment_face_image(face_img)
                    images_to_process.extend(augmented_imgs[1:])  # Excluir original (ya está)
                    logger.info(f"  → Generadas {len(images_to_process)} variaciones")
                
                # Extraer embeddings de todas las variaciones
                for idx, img_variant in enumerate(images_to_process):
                    try:
                        embedding_obj = DeepFace.represent(
                            img_path=img_variant,
                            model_name=RECOGNITION_MODEL,
                            detector_backend='skip',  # Ya tenemos el rostro
                            enforce_detection=False,
                            align=True
                        )
                        
                        if isinstance(embedding_obj, list):
                            embedding = np.array(embedding_obj[0]['embedding'])
                        else:
                            embedding = np.array(embedding_obj['embedding'])
                        
                        embeddings.append(embedding)
                        total_processed += 1
                        
                        if idx == 0:
                            logger.info(f"  ✓ Embedding original: dimensión {embedding.shape}")
                        
                    except Exception as e:
                        logger.debug(f"  ⚠ Error en variación {idx}: {str(e)}")
                        continue
            
            except Exception as e:
                logger.error(f"  ✗ Error al procesar {image_path}: {str(e)}")
                continue
        
        logger.info(f"✓ Total embeddings extraídos: {len(embeddings)} (de {len(image_paths)} imágenes)")
        return embeddings
    
    def register_person(
        self,
        person_name: str,
        image_paths: List[str] = None,
        overwrite: bool = False
    ) -> bool:
        """
        Registra una persona en el sistema.
        
        Args:
            person_name: Nombre de la persona
            image_paths: Lista de rutas a imágenes (opcional, se buscan en data/)
            overwrite: Si True, sobrescribe registro existente
            
        Returns:
            True si el registro fue exitoso
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"Registrando persona: {person_name}")
        logger.info(f"{'='*60}")
        
        # Verificar si ya existe
        if person_name in self.database and not overwrite:
            logger.warning(f"La persona '{person_name}' ya está registrada")
            logger.warning("Usa overwrite=True para sobrescribir")
            return False
        
        # Obtener imágenes si no se proporcionaron
        if image_paths is None:
            image_paths = get_person_images(DATA_DIR, person_name)
        
        if not image_paths:
            logger.error(f"No se encontraron imágenes para: {person_name}")
            logger.error(f"Coloca las imágenes en: {DATA_DIR / person_name}/")
            return False
        
        # Verificar cantidad de imágenes
        num_images = len(image_paths)
        logger.info(f"Imágenes encontradas: {num_images}")
        
        if num_images < MIN_IMAGES_PER_PERSON:
            logger.warning(
                f"Se recomienda al menos {MIN_IMAGES_PER_PERSON} imágenes "
                f"para mejor precisión (tienes {num_images})"
            )
        
        if num_images > MAX_IMAGES_PER_PERSON:
            logger.warning(
                f"Más de {MAX_IMAGES_PER_PERSON} imágenes puede ser innecesario"
            )
            logger.info(f"Usando las primeras {MAX_IMAGES_PER_PERSON} imágenes")
            image_paths = image_paths[:MAX_IMAGES_PER_PERSON]
        
        # Extraer embeddings
        logger.info(f"\nExtrayendo embeddings con modelo: {RECOGNITION_MODEL}")
        embeddings = self._extract_embeddings(image_paths)
        
        if not embeddings:
            logger.error("No se pudo extraer ningún embedding válido")
            return False
        
        logger.info(f"\n✓ Embeddings extraídos: {len(embeddings)}/{len(image_paths)}")
        
        # Guardar en base de datos
        self.database[person_name] = embeddings
        
        # Actualizar metadata
        self.metadata['persons'][person_name] = {
            'num_embeddings': len(embeddings),
            'registered_at': get_timestamp(),
            'image_paths': [str(p) for p in image_paths[:len(embeddings)]],
            'embedding_dim': embeddings[0].shape[0]
        }
        
        # Persistir cambios
        if not self._save_database():
            logger.error("Error al guardar base de datos")
            return False
        
        if not self._save_metadata():
            logger.warning("Error al guardar metadata")
        
        logger.info(f"\n{MSG_SUCCESS_REGISTRATION}: {person_name}")
        logger.info(f"Total de personas en el sistema: {len(self.database)}\n")
        
        return True
    
    def remove_person(self, person_name: str) -> bool:
        """
        Elimina una persona del sistema.
        
        Args:
            person_name: Nombre de la persona a eliminar
            
        Returns:
            True si se eliminó correctamente
        """
        if person_name not in self.database:
            logger.warning(f"La persona '{person_name}' no está registrada")
            return False
        
        # Eliminar de base de datos
        del self.database[person_name]
        
        # Eliminar de metadata
        if person_name in self.metadata['persons']:
            del self.metadata['persons'][person_name]
        
        # Persistir cambios
        self._save_database()
        self._save_metadata()
        
        logger.info(f"Persona eliminada: {person_name}")
        return True


# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================
def quick_register(person_name: str, overwrite: bool = False) -> bool:
    """
    Función rápida para registrar una persona.
    
    ⚡ USA SINGLETON: Reutiliza la instancia de FaceRegistration en memoria.
    
    Args:
        person_name: Nombre de la persona
        overwrite: Si True, sobrescribe registro existente
        
    Returns:
        True si el registro fue exitoso
    """
    registration = get_registration()  # ← Usa instancia global (rápido!)
    return registration.register_person(person_name, overwrite=overwrite)


def quick_remove(person_name: str) -> bool:
    """
    Función rápida para eliminar una persona.
    
    ⚡ USA SINGLETON: Reutiliza la instancia de FaceRegistration en memoria.
    
    Args:
        person_name: Nombre de la persona a eliminar
        
    Returns:
        True si la eliminación fue exitosa
    """
    registration = get_registration()  # ← Usa instancia global (rápido!)
    return registration.remove_person(person_name)


if __name__ == "__main__":
    # Test del sistema de registro
    print_banner("TEST DEL SISTEMA DE REGISTRO")
    
    # Crear instancia
    registration = FaceRegistration()
    
    print(f"\nPersonas en la base de datos: {len(registration.database)}")
    if registration.database:
        print("Personas registradas:")
        for person in registration.database.keys():
            num_embeddings = len(registration.database[person])
            print(f"  - {person}: {num_embeddings} embeddings")
    else:
        print("\nNo hay personas registradas aún")
        print(f"Coloca imágenes en carpetas dentro de: {DATA_DIR}")
        print("Ejemplo: data/ronald/*.jpg")
    
    print("\n✅ Sistema de registro funcionando correctamente\n")

