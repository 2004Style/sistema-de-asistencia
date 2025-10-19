"""
Módulo de gestión de horarios de usuarios.

Este módulo maneja:
- Creación de horarios laborales
- Soporte para múltiples turnos por día
- Validación de solapamiento de horarios
- Detección de turno activo
"""

from .controller import router

__all__ = ["router"]
