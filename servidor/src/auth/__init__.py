"""
Módulo de autenticación y autorización.

Proporciona:
- Dependencias para obtener el usuario actual desde el JWT
- Decoradores para proteger endpoints basados en roles
- Validación de tokens JWT
- Manejo de permisos por rol
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, TYPE_CHECKING

from src.config.database import get_db
from src.utils.security import verify_token
from src.auth.security import get_token_from_header

# Importación de tipo para evitar circular import
if TYPE_CHECKING:
    from src.users.model import User


# ============ DEPENDENCIAS DE AUTENTICACIÓN ============


async def get_current_user(
    token: str = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> "User":
    """
    Obtiene el usuario actual desde el token JWT en el header Authorization.
    
    Si no se proporciona un token válido, lanza excepción 401.
    
    Uso: @router.get("/", dependencies=[Depends(get_current_user)])
    o: async def endpoint(current_user: User = Depends(get_current_user))
    
    Args:
        token: Token JWT (se obtiene del header Authorization automáticamente)
        db: Sesión de base de datos
        
    Returns:
        Usuario autenticado
        
    Raises:
        HTTPException 401: Si el token no es válido o no se proporciona
    """
    # Importar aquí para evitar circular import
    from src.users.model import User
    
    # Verificar y decodificar el token
    try:
        payload = verify_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Obtener user_id del token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: no contiene user_id"
        )
    
    # Obtener usuario de la base de datos
    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: user_id no es número"
        )
    
    user = db.query(User).filter(User.id == user_id_int).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    return user


# ============ DEPENDENCIAS DE AUTORIZACIÓN POR ROL ============


async def require_admin(current_user: "User" = Depends(get_current_user)) -> "User":
    """
    Verifica que el usuario sea administrador.
    
    Args:
        current_user: Usuario autenticado
        
    Returns:
        Usuario si es administrador
        
    Raises:
        HTTPException 403: Si el usuario no es administrador
    """
    if not current_user.es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user


async def require_can_approve(current_user: "User" = Depends(get_current_user)) -> "User":
    """
    Verifica que el usuario tenga permiso para aprobar justificaciones.
    
    Args:
        current_user: Usuario autenticado
        
    Returns:
        Usuario si puede aprobar
        
    Raises:
        HTTPException 403: Si el usuario no tiene permiso
    """
    if not current_user.puede_aprobar:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos para aprobar justificaciones"
        )
    return current_user


async def require_can_view_reports(current_user: "User" = Depends(get_current_user)) -> "User":
    """
    Verifica que el usuario tenga permiso para ver reportes.
    
    Args:
        current_user: Usuario autenticado
        
    Returns:
        Usuario si puede ver reportes
        
    Raises:
        HTTPException 403: Si el usuario no tiene permiso
    """
    if not current_user.puede_ver_reportes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos para ver reportes"
        )
    return current_user


async def require_can_manage_users(current_user: "User" = Depends(get_current_user)) -> "User":
    """
    Verifica que el usuario tenga permiso para gestionar usuarios.
    
    Args:
        current_user: Usuario autenticado
        
    Returns:
        Usuario si puede gestionar usuarios
        
    Raises:
        HTTPException 403: Si el usuario no tiene permiso
    """
    if not current_user.puede_gestionar_usuarios:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos para gestionar usuarios"
        )
    return current_user


async def require_any_role(
    roles: List[str],
    current_user: "User" = Depends(get_current_user)
) -> "User":
    """
    Verifica que el usuario tenga uno de los roles especificados.
    
    Args:
        roles: Lista de nombres de roles permitidos (ej: ["ADMIN", "SUPERVISOR"])
        current_user: Usuario autenticado
        
    Returns:
        Usuario si tiene uno de los roles
        
    Raises:
        HTTPException 403: Si el usuario no tiene ninguno de los roles
    """
    if current_user.role.nombre.upper() not in [r.upper() for r in roles]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Se requiere uno de los siguientes roles: {', '.join(roles)}"
        )
    return current_user


# ============ FUNCIONES AUXILIARES ============


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    Extrae el token JWT del header Authorization.
    
    Formato esperado: "Bearer <token>"
    
    Args:
        authorization: Valor del header Authorization
        
    Returns:
        Token sin "Bearer " o None
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]


def get_token_from_request(request) -> Optional[str]:
    """
    Obtiene el token JWT del request (desde header Authorization o query param).
    
    Args:
        request: Request object de FastAPI
        
    Returns:
        Token JWT o None
    """
    # Intentar desde header Authorization
    auth_header = request.headers.get("Authorization")
    if auth_header:
        return extract_token_from_header(auth_header)
    
    # Intentar desde query parameter (fallback, menos seguro)
    token = request.query_params.get("token")
    if token:
        return token
    
    return None
