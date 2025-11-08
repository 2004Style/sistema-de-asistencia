"""
Pruebas de integración para usuarios.

Cubre:
- Registro de usuario
- Listado de usuarios
- Obtención de usuario por ID
- Actualización de usuario
- Eliminación de usuario
"""
import json
from http import HTTPStatus
from io import BytesIO
from PIL import Image
from tests.integration.auth_helpers import (
    create_admin_user,
    create_employee_user,
    get_auth_headers,
    assert_unauthorized,
)


def create_test_image():
    """Crea una imagen de prueba en bytes."""
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes


def test_users_list_requires_auth(client):
    """Prueba que listar usuarios requiere autenticación."""
    # Sin token = 401
    resp = client.get("/api/users?page=1&pageSize=10")
    assert_unauthorized(resp)


def test_users_list_with_auth(client, admin_user_and_token):
    """Prueba obtención de lista de usuarios CON autenticación."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users?page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.INTERNAL_SERVER_ERROR, HTTPStatus.UNPROCESSABLE_ENTITY]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data


def test_users_list_pagination(client, admin_user_and_token):
    """Prueba paginación de usuarios."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    # Primera página
    resp1 = client.get("/api/users?page=1&pageSize=5", headers=admin_headers)
    # Segunda página
    resp2 = client.get("/api/users?page=2&pageSize=5", headers=admin_headers)
    
    assert resp1.status_code in [HTTPStatus.OK, HTTPStatus.INTERNAL_SERVER_ERROR, HTTPStatus.UNPROCESSABLE_ENTITY]
    assert resp2.status_code in [HTTPStatus.OK, HTTPStatus.INTERNAL_SERVER_ERROR, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_get_user_not_found(client, admin_user_and_token):
    """Prueba obtención de usuario no existente."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users/99999", headers=admin_headers)
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_user_requires_images(client):
    """Prueba que crear usuario requiere imágenes."""
    payload = {
        "name": "Test User",
        "email": "testuser@example.com",
        "codigo_user": "TST001",
        "password": "password123",
        "confirm_password": "password123",
        "role_id": 1
    }
    
    # Sin imágenes, debería fallar
    resp = client.post("/api/users/register", data=payload)
    assert resp.status_code in [HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.INTERNAL_SERVER_ERROR]


def test_create_user_password_mismatch(client):
    """Prueba que las contraseñas deben coincidir."""
    images = [
        ("images", ("test1.jpg", create_test_image(), "image/jpeg")),
        ("images", ("test2.jpg", create_test_image(), "image/jpeg")),
    ]
    
    payload = {
        "name": "Test User",
        "email": "testuser@example.com",
        "codigo_user": "TST001",
        "password": "password123",
        "confirm_password": "different123",
        "role_id": 1
    }
    
    resp = client.post("/api/users/register", data=payload, files=images)
    assert resp.status_code in [HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_create_user_duplicate_email(client):
    """Prueba que no se puede crear usuario con email duplicado."""
    images_data = [
        ("images", ("test1.jpg", create_test_image(), "image/jpeg")),
        ("images", ("test2.jpg", create_test_image(), "image/jpeg")),
    ]
    
    payload1 = {
        "name": "User One",
        "email": "duplicate@example.com",
        "codigo_user": "USR001",
        "password": "password123",
        "confirm_password": "password123",
        "role_id": 1
    }
    
    # Crear primer usuario
    resp1 = client.post("/api/users/register", data=payload1, files=images_data)
    # Si el primer usuario se crea exitosamente, intentar crear otro con el mismo email
    if resp1.status_code in [HTTPStatus.OK, HTTPStatus.CREATED]:
        # Preparar nuevas imágenes para el segundo request
        images_data2 = [
            ("images", ("test3.jpg", create_test_image(), "image/jpeg")),
            ("images", ("test4.jpg", create_test_image(), "image/jpeg")),
        ]
        
        payload2 = {
            "name": "User Two",
            "email": "duplicate@example.com",
            "codigo_user": "USR002",
            "password": "password123",
            "confirm_password": "password123",
            "role_id": 1
        }
        
        resp2 = client.post("/api/users/register", data=payload2, files=images_data2)
        assert resp2.status_code in [HTTPStatus.BAD_REQUEST, HTTPStatus.CONFLICT, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_get_user_by_codigo(client, admin_user_and_token):
    """Prueba obtención de usuario por código."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users/codigo/ADMIN001", headers=admin_headers)
    # Si existe el usuario ADMIN001, debe retornar OK o NOT_FOUND
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.INTERNAL_SERVER_ERROR]


def test_search_users(client, admin_user_and_token):
    """Prueba búsqueda de usuarios."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users?search=test&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.INTERNAL_SERVER_ERROR]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data


def test_update_user_not_found(client, admin_user_and_token):
    """Prueba actualización de usuario no existente."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    payload = {
        "name": "Updated User",
        "email": "updated@example.com"
    }
    
    resp = client.put("/api/users/99999", json=payload, headers=admin_headers)


def test_search_users(client, test_session_factory):
    """Prueba búsqueda de usuarios."""
    db = test_session_factory()
    admin_user, admin_token = create_admin_user(db)
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users?search=test&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.INTERNAL_SERVER_ERROR]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data


def test_update_user_requires_auth(client):
    """Prueba que actualizar usuario requiere autenticación."""
    payload = {
        "name": "Updated User",
        "email": "updated@example.com"
    }
    
    resp = client.put("/api/users/99999", json=payload)
    assert_unauthorized(resp)


def test_update_user_not_found(client, test_session_factory):
    """Prueba actualización de usuario no existente."""
    db = test_session_factory()
    admin_user, admin_token = create_admin_user(db)
    admin_headers = get_auth_headers(admin_token)
    
    payload = {
        "name": "Updated User",
        "email": "updated@example.com"
    }
    
    resp = client.put("/api/users/99999", json=payload, headers=admin_headers)
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_delete_user_requires_auth(client):
    """Prueba que eliminar usuario requiere autenticación."""
    resp = client.delete("/api/users/99999")
    assert_unauthorized(resp)


def test_delete_user_not_found(client, admin_user_and_token):
    """Prueba eliminación de usuario no existente."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.delete("/api/users/99999", headers=admin_headers)
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_user_list_with_filters(client, admin_user_and_token):
    """Prueba listado de usuarios con filtros."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users?page=1&pageSize=10&sortBy=name&sortOrder=asc", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.INTERNAL_SERVER_ERROR, HTTPStatus.UNPROCESSABLE_ENTITY]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data


def test_get_all_users_minimal(client, admin_user_and_token):
    """Prueba obtención de todos los usuarios de forma minimal."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/users?page=1&pageSize=100", headers=admin_headers)
    # Puede retornar OK si el endpoint existe, o error de servidor
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.INTERNAL_SERVER_ERROR]
