"""
Controlador de endpoints para autenticación.

Define los endpoints REST para:
- Refresh de tokens JWT
- Validación de tokens

RUTAS PÚBLICAS (sin autenticación):
- POST /auth/refresh-token - Refresh token

RUTAS PROTEGIDAS (requieren autenticación):
- GET /auth/validate - Validar token actual
"""

from fastapi import APIRouter, HTTPException, status, Header
from typing import Optional, Dict, Any

from src.utils.security import verify_token, create_tokens
from src.common_schemas import create_single_response, create_error_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/refresh-token")
async def refresh_token(authorization: Optional[str] = Header(None)):
    """
    Refresca el token de autenticación.
    
    🔓 RUTA PÚBLICA (sin autenticación requerida)
    
    Requiere:
    - **Authorization**: Header con formato "Refresh <refresh_token>"
    
    Returns:
        {
            "data": {
                "accessToken": "...",
                "refreshToken": "...",
                "expiresIn": seconds
            },
            "message": string
        }
    
    Raises:
        HTTPException 401: Si el refresh token es inválido o está expirado
        HTTPException 400: Si el header Authorization tiene formato incorrecto
    """
    try:
        # Validar que se proporcionó el header
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="No se proporcionó token de refresco",
                    error="Authorization header requerido con formato 'Refresh <token>'",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        # Parsear el header
        parts = authorization.split()
        
        if len(parts) != 2 or parts[0].lower() != "refresh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=create_error_response(
                    message="Formato de Authorization incorrecto",
                    error="Debe ser: 'Refresh <token>'",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            )
        
        refresh_token_str = parts[1]
        
        # Verificar el refresh token
        try:
            payload = verify_token(refresh_token_str)
        except HTTPException as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="Refresh token inválido o expirado",
                    error="El token de refresco no es válido o ha expirado",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        # Validar que el token es de tipo refresh
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="Token inválido",
                    error="El token proporcionado no es un refresh token válido",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        # Obtener datos del usuario del token
        user_id = int(payload.get("sub"))
        user_email = payload.get("email")
        
        if not user_id or not user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="Token incompleto",
                    error="El token no contiene datos de usuario válidos",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        # Generar nuevos tokens
        new_tokens = create_tokens(user_id, user_email)
        
        return create_single_response(
            data=new_tokens,
            message="Token refrescado exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al refrescar token",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.get("/validate")
async def validate_token(authorization: Optional[str] = Header(None)):
    """
    Valida que el token de acceso sea válido.
    
    🔒 RUTA PROTEGIDA (requiere autenticación)
    
    Requiere:
    - **Authorization**: Header con formato "Bearer <access_token>"
    
    Returns:
        {
            "data": {
                "valid": bool,
                "user_id": int,
                "email": str,
                "exp": unix_timestamp
            },
            "message": string
        }
    
    Raises:
        HTTPException 401: Si el token es inválido
    """
    try:
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="No se proporcionó token",
                    error="Authorization header requerido",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        # Parsear el header
        parts = authorization.split()
        
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=create_error_response(
                    message="Formato de Authorization incorrecto",
                    error="Debe ser: 'Bearer <token>'",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            )
        
        access_token_str = parts[1]
        
        # Verificar el token
        try:
            payload = verify_token(access_token_str)
        except HTTPException as e:
            raise e
        
        return create_single_response(
            data={
                "valid": True,
                "user_id": int(payload.get("sub")),
                "email": payload.get("email"),
                "exp": payload.get("exp")
            },
            message="Token válido"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al validar token",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )
