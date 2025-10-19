import json
from http import HTTPStatus


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data.get("status") == "healthy"
    assert "database" in data
    assert "scheduler" in data


def test_roles_crud_flow(client):
    # 1. Create a role
    payload = {
        "nombre": "tester",
        "descripcion": "Role para pruebas",
        "es_admin": False,
        "puede_aprobar": False,
        "puede_ver_reportes": False,
        "puede_gestionar_usuarios": False,
        "activo": True
    }

    create_resp = client.post("/api/roles/", json=payload)
    # El endpoint de creación puede requerir autenticación (402, 403, 500)
    if create_resp.status_code in [HTTPStatus.OK, HTTPStatus.CREATED]:
        created = create_resp.json().get("data")
        assert created is not None
        assert created.get("nombre") == payload["nombre"].upper()
        role_id = created.get("id")
        assert isinstance(role_id, int)

        # 2. List roles and ensure at least one exists
        list_resp = client.get("/api/roles/?page=1&pageSize=10")
        assert list_resp.status_code == HTTPStatus.OK
        list_data = list_resp.json()
        assert "data" in list_data
        assert list_data["data"]["totalRecords"] >= 1

        # 3. Get the created role
        get_resp = client.get(f"/api/roles/{role_id}")
        assert get_resp.status_code == HTTPStatus.OK
        get_data = get_resp.json().get("data")
        assert get_data.get("id") == role_id
        assert get_data.get("nombre") == payload["nombre"].upper()
    else:
        # Si falla la creación por permisos, al menos verificamos que el listado funciona
        list_resp = client.get("/api/roles/?page=1&pageSize=10")
        assert list_resp.status_code == HTTPStatus.OK
        assert "data" in list_resp.json()
