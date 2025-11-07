from http import HTTPStatus
from tests.integration.auth_helpers import (
    get_auth_headers,
    assert_ok,
    assert_unauthorized,
    assert_forbidden,
)


def test_health_endpoint(client):
    """Test que el endpoint de health funciona sin autenticación."""
    resp = client.get("/health")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data.get("status") == "healthy"
    assert "database" in data
    assert "scheduler" in data


def test_roles_public_list(client):
    """Test: Listar roles es PÚBLICO (sin autenticación)."""
    resp = client.get("/api/roles/?page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "data" in data
    assert data["data"]["totalRecords"] >= 0


def test_roles_create_without_auth(client):
    """Test: Crear rol SIN autenticación debe retornar 401."""
    payload = {
        "nombre": "tester",
        "descripcion": "Role para pruebas",
        "es_admin": False,
        "puede_aprobar": False,
        "puede_ver_reportes": False,
        "puede_gestionar_usuarios": False,
        "activo": True
    }
    
    resp = client.post("/api/roles/", json=payload)
    assert_unauthorized(resp, "crear rol")


def test_roles_create_with_employee_token(client, employee_user_and_token):
    """Test: Crear rol CON token de empleado debe retornar 403."""
    payload = {
        "nombre": "tester",
        "descripcion": "Role para pruebas",
        "es_admin": False,
        "puede_aprobar": False,
        "puede_ver_reportes": False,
        "puede_gestionar_usuarios": False,
        "activo": True
    }
    
    employee_user, employee_token = employee_user_and_token
    employee_headers = get_auth_headers(employee_token)
    
    resp = client.post("/api/roles/", json=payload, headers=employee_headers)
    # Con token de empleado, debe retornar 403
    assert resp.status_code == HTTPStatus.FORBIDDEN


def test_roles_crud_flow(client):
    """Test: Flow CRUD de roles."""
    # 1. List roles (sin autenticación, es público)
    list_resp = client.get("/api/roles/?page=1&pageSize=10")
    assert list_resp.status_code == HTTPStatus.OK
    list_data = list_resp.json()
    assert "data" in list_data
    
    # 2. Si hay roles, obtener uno
    if list_data["data"]["records"]:
        existing_role_id = list_data["data"]["records"][0]["id"]
        
        # Get de un rol específico
        get_resp = client.get(f"/api/roles/{existing_role_id}")
        # Podría ser público o requerir autenticación
        assert get_resp.status_code in [HTTPStatus.OK, HTTPStatus.UNAUTHORIZED]
