"""
Configuración de seguridad para FastAPI.

Define esquemas de autenticación y proveedores de token.
"""

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, status, Depends
from typing import Optional

security = HTTPBearer(
    description="JWT Bearer Token",
    auto_error=False  # No lanzar error automáticamente si no hay token
)


def get_token_from_header(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Extrae el token del header Authorization: Bearer <token>.
    
    Args:
        credentials: Credentials extraídas automáticamente por HTTPBearer
        
    Returns:
        Token JWT
        
    Raises:
        HTTPException 401: Si no se proporciona un token válido
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autenticación",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return credentials.credentials
