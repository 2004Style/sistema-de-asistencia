"""
Common response schemas for standardized API responses
Esquemas de respuesta estándar para toda la API
"""
from typing import TypeVar, Generic, Optional
from pydantic import BaseModel, Field

# Type variable para permitir respuestas genéricas
T = TypeVar('T')


class PaginatedData(BaseModel, Generic[T]):
    """Datos paginados para respuestas de listas"""
    records: list[T] = Field(..., description="Lista de registros")
    totalRecords: int = Field(..., description="Número total de registros")
    totalPages: int = Field(..., description="Número total de páginas")
    currentPage: int = Field(..., description="Página actual")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Respuesta estándar para endpoints que retornan listas paginadas
    
    Estructura:
    {
        "data": {
            "records": T[],
            "totalRecords": number,
            "totalPages": number,
            "currentPage": number
        },
        "message": string
    }
    """
    data: PaginatedData[T]
    message: str = Field(default="Operación exitosa", description="Mensaje descriptivo")


class SingleResponse(BaseModel, Generic[T]):
    """
    Respuesta estándar para endpoints que retornan un solo objeto
    
    Estructura:
    {
        "data": T,
        "message": string
    }
    """
    data: T
    message: str = Field(default="Operación exitosa", description="Mensaje descriptivo")


class ErrorResponse(BaseModel):
    """
    Respuesta estándar para errores
    
    Estructura:
    {
        "message": string,
        "error": string,
        "statusCode": number
    }
    """
    message: str = Field(..., description="Mensaje de error para el usuario")
    error: str = Field(..., description="Detalle técnico del error")
    statusCode: int = Field(..., description="Código de estado HTTP")


class PaginationParams(BaseModel):
    """Parámetros de paginación y búsqueda"""
    page: int = Field(default=1, ge=1, description="Número de página")
    pageSize: int = Field(default=10, ge=1, le=100, description="Tamaño de página")
    search: Optional[str] = Field(default=None, description="Término de búsqueda")
    sortBy: Optional[str] = Field(default=None, description="Campo para ordenar")
    sortOrder: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Orden ascendente o descendente")


def create_paginated_response(
    records: list,
    total_records: int,
    page: int,
    page_size: int,
    message: str = "Operación exitosa"
) -> dict:
    """
    Función auxiliar para crear respuestas paginadas
    
    Args:
        records: Lista de registros para la página actual
        total_records: Total de registros en la base de datos
        page: Número de página actual
        page_size: Tamaño de página
        message: Mensaje personalizado
        
    Returns:
        Diccionario con la estructura de respuesta paginada
    """
    import math
    total_pages = math.ceil(total_records / page_size) if page_size > 0 else 0
    
    return {
        "data": {
            "records": records,
            "totalRecords": total_records,
            "totalPages": total_pages,
            "currentPage": page
        },
        "message": message
    }


def create_single_response(data: any, message: str = "Operación exitosa") -> dict:
    """
    Función auxiliar para crear respuestas de objeto único
    
    Args:
        data: Objeto de datos a retornar
        message: Mensaje personalizado
        
    Returns:
        Diccionario con la estructura de respuesta única
    """
    return {
        "data": data,
        "message": message
    }


def create_error_response(
    message: str,
    error: str,
    status_code: int
) -> dict:
    """
    Función auxiliar para crear respuestas de error
    
    Args:
        message: Mensaje descriptivo para el usuario
        error: Detalle técnico del error
        status_code: Código de estado HTTP
        
    Returns:
        Diccionario con la estructura de error
    """
    return {
        "message": message,
        "error": error,
        "statusCode": status_code
    }
