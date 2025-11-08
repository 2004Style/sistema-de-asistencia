"""
Módulo de limpieza de memoria para TensorFlow y DeepFace.
Ayuda a evitar memory leaks durante la inicialización de modelos pesados.
"""
import gc
import warnings
from typing import Optional

try:
    import tensorflow as tf
except ImportError:
    tf = None

try:
    import torch
except ImportError:
    torch = None

from .utils import logger


def cleanup_tensorflow() -> None:
    """
    Limpia la memoria de TensorFlow y desactiva advertencias verbosas.
    Ayuda a prevenir memory leaks.
    """
    if tf is None:
        return
    
    try:
        # Desactivar advertencias de TensorFlow
        tf.get_logger().setLevel('ERROR')
        
        # Limpiar sesión (si existe)
        try:
            tf.keras.backend.clear_session()
            logger.debug("✓ TensorFlow session cleared")
        except Exception:
            pass
        
        # Garbage collection agresivo
        gc.collect()
        logger.debug("✓ Garbage collection completed")
        
    except Exception as e:
        logger.warning(f"Could not cleanup TensorFlow: {e}")


def cleanup_torch() -> None:
    """
    Limpia la caché de memoria de PyTorch.
    """
    if torch is None:
        return
    
    try:
        if hasattr(torch.cuda, 'empty_cache'):
            torch.cuda.empty_cache()
            logger.debug("✓ PyTorch CUDA cache cleared")
    except Exception as e:
        logger.warning(f"Could not cleanup PyTorch: {e}")


def suppress_warnings() -> None:
    """
    Suprime advertencias verbosas durante la inicialización.
    """
    # Suprimir advertencias de TensorFlow
    warnings.filterwarnings('ignore', category=DeprecationWarning)
    warnings.filterwarnings('ignore', category=FutureWarning)
    
    # Suprimir logs verbosos
    import os
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Solo mostrar errores (level 3)
    os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Evitar advertencias de oneDNN
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'  # Evitar conflictos de bibliotecas
    
    logger.debug("✓ Warnings suppressed")


def full_cleanup() -> None:
    """
    Realiza limpieza completa de memoria.
    Llamar después de operaciones pesadas de ML.
    """
    cleanup_tensorflow()
    cleanup_torch()
    gc.collect()
    logger.debug("✓ Full memory cleanup completed")


def initialize_memory_optimization() -> None:
    """
    Inicializa optimizaciones de memoria al inicio de la aplicación.
    """
    suppress_warnings()
    
    if tf is not None:
        try:
            # Limitar memoria de GPU si está disponible
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                try:
                    # Permitir crecimiento dinámico de memoria
                    for gpu in gpus:
                        tf.config.experimental.set_memory_growth(gpu, True)
                    logger.info(f"✓ GPU memory growth enabled for {len(gpus)} GPU(s)")
                except RuntimeError as e:
                    logger.warning(f"GPU memory optimization failed: {e}")
        except Exception as e:
            logger.warning(f"Could not configure GPU: {e}")
    
    cleanup_tensorflow()
