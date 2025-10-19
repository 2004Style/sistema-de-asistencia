"""
Módulo de gestión de usuarios.

Este módulo maneja:
- Creación de usuarios con registro facial (10 imágenes)
- Autenticación y autorización
- Gestión de perfiles y permisos
- Integración con sistema de reconocimiento facial
"""

from .controller import router

__all__ = ["router"]
