"""
Helpers para autenticación en tests de integración.

Proporciona funciones para:
- Crear usuarios con diferentes roles y permisos
- Generar tokens JWT para tests
- Hacer requests autenticados
- Helpers para diferentes niveles de acceso
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from src.utils.security import hash_password, create_access_token
from src.roles.model import Role
from src.users.model import User


def create_role(
    db: Session,
    nombre: str,
    es_admin: bool = False,
    puede_aprobar: bool = False,
    puede_ver_reportes: bool = False,
    puede_gestionar_usuarios: bool = False,
) -> Role:
    """
    Crea un rol en la base de datos.
    
    Args:
        db: Sesión de base de datos
        nombre: Nombre del rol
        es_admin: Si es administrador
        puede_aprobar: Si puede aprobar justificaciones
        puede_ver_reportes: Si puede ver reportes
        puede_gestionar_usuarios: Si puede gestionar usuarios
        
    Returns:
        Rol creado
    """
    # Verificar si ya existe
    existing_role = db.query(Role).filter(Role.nombre == nombre).first()
    if existing_role:
        return existing_role
    
    role = Role(
        nombre=nombre,
        es_admin=es_admin,
        puede_aprobar=puede_aprobar,
        puede_ver_reportes=puede_ver_reportes,
        puede_gestionar_usuarios=puede_gestionar_usuarios,
        activo=True
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def create_user(
    db: Session,
    name: str,
    email: str,
    codigo_user: str,
    password: str = "test123456",
    role: Optional[Role] = None,
    is_active: bool = True,
    es_admin: bool = False,
    puede_aprobar: bool = False,
    puede_ver_reportes: bool = False,
    puede_gestionar_usuarios: bool = False,
) -> User:
    """
    Crea un usuario en la base de datos.
    
    Args:
        db: Sesión de base de datos
        name: Nombre del usuario
        email: Correo electrónico (único)
        codigo_user: Código único del usuario
        password: Contraseña en texto plano
        role: Role del usuario (se crea si no se proporciona)
        is_active: Si el usuario está activo
        es_admin: Si es administrador (se asigna al role)
        puede_aprobar: Si puede aprobar (se asigna al role)
        puede_ver_reportes: Si puede ver reportes (se asigna al role)
        puede_gestionar_usuarios: Si puede gestionar usuarios (se asigna al role)
        
    Returns:
        Usuario creado
    """
    # Verificar si el usuario ya existe
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return existing_user
    
    # Crear o usar role proporcionado
    if role is None:
        role = create_role(
            db,
            nombre=f"ROLE_{name.upper().replace(' ', '_')}",
            es_admin=es_admin,
            puede_aprobar=puede_aprobar,
            puede_ver_reportes=puede_ver_reportes,
            puede_gestionar_usuarios=puede_gestionar_usuarios,
        )
    
    # Crear usuario
    hashed_pwd = hash_password(password)
    user = User(
        name=name,
        email=email,
        codigo_user=codigo_user,
        password=hashed_pwd,
        role_id=role.id,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_token_for_user(user: User) -> str:
    """
    Genera un token JWT válido para un usuario.
    
    Args:
        user: Usuario para el cual generar el token
        
    Returns:
        Token JWT
    """
    token_data = {"sub": str(user.id)}
    token = create_access_token(data=token_data)
    return token


def get_auth_headers(token: str) -> Dict[str, str]:
    """
    Retorna headers de autorización con el token.
    
    Args:
        token: Token JWT
        
    Returns:
        Dict con headers de autorización
    """
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# HELPERS PARA CREAR USUARIOS CON DIFERENTES ROLES
# ============================================================================


def create_admin_user(db: Session) -> tuple[User, str]:
    """
    Crea un usuario administrador y retorna el usuario y su token.
    
    Args:
        db: Sesión de base de datos
        
    Returns:
        Tupla (usuario, token)
    """
    admin_role = create_role(
        db,
        nombre="ADMINISTRADOR",  # Debe ser exactamente "ADMINISTRADOR"
        es_admin=True,
        puede_aprobar=True,
        puede_ver_reportes=True,
        puede_gestionar_usuarios=True,
    )
    
    admin_user = create_user(
        db,
        name="Admin User",
        email="admin@test.local",
        codigo_user="ADMIN001",
        role=admin_role,
    )
    
    token = get_token_for_user(admin_user)
    return admin_user, token


def create_supervisor_user(db: Session) -> tuple[User, str]:
    """
    Crea un usuario supervisor y retorna el usuario y su token.
    
    Args:
        db: Sesión de base de datos
        
    Returns:
        Tupla (usuario, token)
    """
    supervisor_role = create_role(
        db,
        nombre="SUPERVISOR",
        es_admin=False,
        puede_aprobar=True,
        puede_ver_reportes=True,
        puede_gestionar_usuarios=False,
    )
    
    supervisor_user = create_user(
        db,
        name="Supervisor User",
        email="supervisor@test.local",
        codigo_user="SUP001",
        role=supervisor_role,
    )
    
    token = get_token_for_user(supervisor_user)
    return supervisor_user, token


def create_employee_user(db: Session, email_suffix: str = "") -> tuple[User, str]:
    """
    Crea un usuario empleado/colaborador y retorna el usuario y su token.
    
    Args:
        db: Sesión de base de datos
        email_suffix: Sufijo para el email (para crear múltiples)
        
    Returns:
        Tupla (usuario, token)
    """
    employee_role = create_role(
        db,
        nombre="COLABORADOR",
        es_admin=False,
        puede_aprobar=False,
        puede_ver_reportes=False,
        puede_gestionar_usuarios=False,
    )
    
    emp_user = create_user(
        db,
        name="Employee User",
        email=f"employee{email_suffix}@test.local",
        codigo_user=f"EMP{email_suffix or '001'}",
        role=employee_role,
    )
    
    token = get_token_for_user(emp_user)
    return emp_user, token


# ============================================================================
# HELPERS PARA VERIFICAR RESPUESTAS
# ============================================================================


def assert_unauthorized(response, detail: Optional[str] = None):
    """
    Verifica que la respuesta sea 401 Unauthorized.
    
    Args:
        response: Response de TestClient
        detail: Detalle esperado en la respuesta (opcional) - solo verifica que sea 401, ignora detail si se proporciona
    """
    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}: {response.json()}"


def assert_forbidden(response, detail: Optional[str] = None):
    """
    Verifica que la respuesta sea 403 Forbidden.
    
    Args:
        response: Response de TestClient
        detail: Detalle esperado en la respuesta (opcional) - solo verifica que sea 403, ignora detail si se proporciona
    """
    assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.json()}"


def assert_ok(response):
    """
    Verifica que la respuesta sea 200 OK.
    
    Args:
        response: Response de TestClient
    """
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"


def assert_created(response):
    """
    Verifica que la respuesta sea 201 Created.
    
    Args:
        response: Response de TestClient
    """
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"


def assert_not_found(response):
    """
    Verifica que la respuesta sea 404 Not Found.
    
    Args:
        response: Response de TestClient
    """
    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.json()}"
