"""
Módulo de gestión de asistencias.

Este módulo maneja:
- Registro de entrada y salida
- Validación de horarios y turnos
- Cálculo de horas trabajadas
- Registro manual y automático
"""

from .controller import router

__all__ = ["router"]
