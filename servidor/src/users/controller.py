"""
Controlador de endpoints para usuarios.

Define los endpoints REST para:
- Registro de usuarios con imágenes faciales
- Consulta de usuarios
- Paginación y búsqueda
- Actualización y eliminación

RUTAS PÚBLICAS (sin autenticación):
- POST /users/register - Registro de usuario
- POST /users/login/credentials - Login

RUTAS PROTEGIDAS (requieren autenticación):
- GET /users/ - Listar usuarios
- GET /users/{user_id} - Obtener usuario
- GET /users/codigo/{codigo} - Obtener por código
- PUT /users/{user_id} - Actualizar usuario
- DELETE /users/{user_id} - Eliminar usuario

PERMISOS ESPECIALES:
- Solo ADMIN: GET /users/, PUT /users/{user_id}, DELETE /users/{user_id}
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Query
from pydantic import ValidationError
import json
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING

from src.config.database import get_db
from .service import user_service
from .schemas import UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse
from src.roles.service import role_service
from src.common_schemas import create_single_response, create_paginated_response, create_error_response
from src.utils.security import create_tokens
from src.auth import get_current_user, require_admin, require_can_manage_users

if TYPE_CHECKING:
    from src.users.model import User


router = APIRouter(prefix="/users", tags=["users"])


# ============================================================================
# RUTAS PÚBLICAS (sin autenticación)
# ============================================================================


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    codigo_user: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    role_id: Optional[int] = Form(None),
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo usuario con reconocimiento facial.
    
    🔓 RUTA PÚBLICA (sin autenticación requerida)
    
    Requiere:
    - **name**: Nombre completo del usuario
    - **email**: Correo electrónico único
    - **codigo_user**: Código único del usuario
    - **password**: Contraseña (mínimo 8 caracteres)
    - **confirm_password**: Confirmación de contraseña
    - **role_id**: ID del rol a asignar
    - **images**: Exactamente 10 imágenes faciales para reconocimiento
    
    Returns:
        {
            "data": UserResponse,
            "message": string
        }
    """
    try:
        # Si no se proporciona role_id, usar el rol por defecto (COLABORADOR)
        if not role_id:
            default_role = role_service.obtener_rol_default(db)
            if not default_role:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se encontró el rol por defecto 'COLABORADOR' en el sistema"
                )
            role_id_to_use = default_role.id
        else:
            role_id_to_use = role_id

        # Crear objeto UserCreate para validación
        user_data = UserCreate(
            name=name,
            email=email,
            codigo_user=codigo_user,
            password=password,
            confirm_password=confirm_password,
            role_id=role_id_to_use
        )
        
        # Crear usuario con imágenes
        user = user_service.create_user(db, user_data, images)
        
        return create_single_response(
            data=UserResponse.model_validate(user),
            message="Usuario registrado exitosamente"
        )
    except HTTPException as e:
        raise e
    except ValidationError as e:
        # Errores de validación del modelo UserCreate -> devolver 422 con detalles
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=create_error_response(
                message="Error de validación en los datos de usuario",
                error=json.dumps(e.errors(), default=str, ensure_ascii=False),
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al registrar usuario",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.post("/login/credentials", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint de login con email y contraseña.
    
    🔓 RUTA PÚBLICA (sin autenticación requerida)
    
    Requiere:
    - **email**: Correo electrónico del usuario
    - **password**: Contraseña del usuario
    
    Returns:
        {
            "user": { ... datos del usuario ... },
            "backendTokens": {
                "accessToken": "...",
                "refreshToken": "...",
                "expiresIn": 900
            }
        }
    
    Raises:
        HTTPException 401: Si las credenciales son inválidas
        HTTPException 403: Si el usuario está inactivo
    """
    try:
        # Autenticar usuario
        print(credentials)
        user = user_service.authenticate_user(db, credentials.email, credentials.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña inválidos"
            )
        
        # Verificar que el usuario está activo
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario está inactivo"
            )
        
        # Generar tokens
        tokens = create_tokens(user.id, user.email)
        
        # Retornar respuesta con usuario y tokens
        return LoginResponse(
            user=UserResponse.model_validate(user),
            backendTokens=tokens
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al procesar el login",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


# ============================================================================
# RUTAS PROTEGIDAS (requieren autenticación)
# ============================================================================


@router.get("/{user_id}")
def get_user(
    user_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene un usuario por su ID.
    
    🔒 RUTA PROTEGIDA (requiere autenticación)
    
    Returns:
        {
            "data": UserResponse,
            "message": string
        }
    """
    try:
        user = user_service.get_user(db, user_id)
        return create_single_response(
            data=UserResponse.model_validate(user),
            message="Usuario obtenido exitosamente"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al obtener usuario",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.get("/codigo/{codigo}")
def get_user_by_code(
    codigo: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene un usuario por su código.

    🔒 RUTA PÚBLICA (requiere autenticación)

    Returns:
        {
            "data": UserResponse,
            "message": string
        }
    """
    try:
        user = user_service.get_by_codigo(db, codigo)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return create_single_response(
            data=UserResponse.model_validate(user),
            message="Usuario obtenido exitosamente"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al obtener usuario",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.get("/")
def get_users(
    page: int = Query(1, ge=1, description="Número de página"),
    pageSize: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    search: Optional[str] = Query(None, description="Término de búsqueda"),
    sortBy: Optional[str] = Query(None, description="Campo para ordenar"),
    sortOrder: str = Query("asc", regex="^(asc|desc)$", description="Orden de clasificación"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Lista usuarios con paginación, búsqueda y ordenamiento.
    
    🔒 RUTA PROTEGIDA - SOLO ADMIN (requiere autenticación y rol ADMINISTRADOR)
    
    Query params:
    - **page**: Número de página (inicia en 1)
    - **pageSize**: Cantidad de registros por página (máximo 100)
    - **search**: Término de búsqueda (busca en nombre, email, código)
    - **sortBy**: Campo para ordenar (name, email, codigo_user, created_at)
    - **sortOrder**: Orden de clasificación (asc o desc)
    
    Returns:
        {
            "data": {
                "records": UserResponse[],
                "totalRecords": number,
                "totalPages": number,
                "currentPage": number
            },
            "message": string
        }
    """
    try:
        result = user_service.get_users_paginated(
            db=db,
            page=page,
            page_size=pageSize,
            search=search,
            sort_by=sortBy,
            sort_order=sortOrder
        )
        
        return {
            "data": result,
            "message": "Usuarios obtenidos exitosamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al obtener usuarios",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.put("/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 PUEDE GESTIONAR USUARIOS - Actualiza información de un usuario.
    
    Permitido para: ADMIN, RRHH
    
    Returns:
        {
            "data": UserResponse,
            "message": string
        }
    """
    try:
        user = user_service.update_user(db, user_id, user_data)
        return create_single_response(
            data=UserResponse.model_validate(user),
            message="Usuario actualizado exitosamente"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al actualizar usuario",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Elimina un usuario y sus datos asociados.
    
    🔒 RUTA PROTEGIDA - SOLO ADMIN (requiere autenticación y rol ADMINISTRADOR)
    
    Esto eliminará:
    - El usuario de la base de datos
    - La carpeta del usuario en data/username
    - El registro del sistema de reconocimiento
    
    Returns:
        {
            "data": {"deleted": true},
            "message": string
        }
    """
    try:
        result = user_service.delete_user(db, user_id)
        return create_single_response(
            data={"deleted": True},
            message=result["message"]
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=create_error_response(
                message="Error al eliminar usuario",
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        )
