"""
Módulo de reportes.

Genera reportes de asistencia en PDF y Excel.
Sin modelo de base de datos - solo genera archivos.
"""

from .controller import router

__all__ = ["router"]
