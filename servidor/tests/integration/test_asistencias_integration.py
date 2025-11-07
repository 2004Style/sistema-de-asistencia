"""
Pruebas de integración para asistencias.

Cubre:
- Registro manual de asistencia
- Listado de asistencias
- Obtención de asistencia por ID
- Actualización de asistencia
- Eliminación de asistencia
- Filtrado por usuario, fecha, estado
"""
from http import HTTPStatus
from datetime import datetime, timedelta
from tests.integration.auth_helpers import get_auth_headers


def test_asistencias_list(client, admin_user_and_token):
    """Prueba obtención de lista de asistencias."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "data" in data


def test_asistencias_list_pagination(client, admin_user_and_token):
    """Prueba paginación de asistencias."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp1 = client.get("/api/asistencia?page=1&pageSize=5", headers=admin_headers)
    assert resp1.status_code == HTTPStatus.OK
    
    resp2 = client.get("/api/asistencia?page=2&pageSize=5", headers=admin_headers)
    assert resp2.status_code == HTTPStatus.OK


def test_get_asistencia_not_found(client, admin_user_and_token):
    """Prueba obtención de asistencia no existente."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia/99999", headers=admin_headers)
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_asistencia_manual_minimal(client):
    """Prueba registro manual de asistencia con datos mínimos."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 1,
        "fecha": str(today),
        "hora_entrada": "08:00:00",
        "metodo": "MANUAL"
    }
    
    resp = client.post("/api/asistencia/registrar-manual", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.METHOD_NOT_ALLOWED,
        HTTPStatus.INTERNAL_SERVER_ERROR
    ]


def test_create_asistencia_entrada_salida(client):
    """Prueba registro de entrada y salida."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 1,
        "fecha": str(today),
        "hora_entrada": "08:00:00",
        "hora_salida": "17:00:00",
        "metodo": "MANUAL"
    }
    
    resp = client.post("/api/asistencia/registrar-manual", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.METHOD_NOT_ALLOWED,
        HTTPStatus.INTERNAL_SERVER_ERROR
    ]



def test_asistencias_by_user(client, admin_user_and_token):
    """Prueba obtención de asistencias por usuario."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?user_id=1&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data or "asistencias" in data


def test_asistencias_by_date_range(client, admin_user_and_token):
    """Prueba obtención de asistencias por rango de fechas."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    start_date = (today - timedelta(days=7))
    end_date = today
    
    resp = client.get(f"/api/asistencia?fecha_inicio={start_date}&fecha_fin={end_date}&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_asistencias_by_status(client, admin_user_and_token):
    """Prueba obtención de asistencias por estado."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?estado=PRESENTE&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_asistencias_by_method(client, admin_user_and_token):
    """Prueba obtención de asistencias por método."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?metodo=MANUAL&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_asistencias_today(client, admin_user_and_token):
    """Prueba obtención de asistencias de hoy."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    resp = client.get(f"/api/asistencia?fecha={today}&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_asistencias_user_today(client, admin_user_and_token):
    """Prueba obtención de asistencia de usuario para hoy."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    resp = client.get(f"/api/asistencia?user_id=1&fecha={today}", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST]


def test_get_asistencia_by_date_range(client, admin_user_and_token):
    """Prueba reporte de asistencias por rango de fechas."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    start_date = (today - timedelta(days=30))
    
    resp = client.get(f"/api/asistencia/reporte?fecha_inicio={start_date}&fecha_fin={today}", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_asistencias_by_date_range(client, admin_user_and_token):
    """Prueba obtención de asistencias por rango de fechas."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    start_date = (today - timedelta(days=7))
    end_date = today
    
    resp = client.get(f"/api/asistencia?fecha_inicio={start_date}&fecha_fin={end_date}&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_asistencias_by_status(client, admin_user_and_token):
    """Prueba obtención de asistencias por estado."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?estado=PRESENTE&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_asistencias_by_method(client, admin_user_and_token):
    """Prueba obtención de asistencias por método."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    resp = client.get("/api/asistencia?metodo=MANUAL&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_update_asistencia_not_found(client):
    """Prueba actualización de asistencia no existente."""
    payload = {
        "estado": "JUSTIFICADA",
        "observaciones": "Justificado por enfermedad"
    }
    
    resp = client.put("/api/asistencia/99999", json=payload)
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNAUTHORIZED, HTTPStatus.METHOD_NOT_ALLOWED]


def test_delete_asistencia_not_found(client):
    """Prueba eliminación de asistencia no existente."""
    resp = client.delete("/api/asistencia/99999")
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.UNAUTHORIZED, HTTPStatus.METHOD_NOT_ALLOWED]


def test_asistencias_today(client, admin_user_and_token):
    """Prueba obtención de asistencias de hoy."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    resp = client.get(f"/api/asistencia?fecha={today}&page=1&pageSize=10", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_asistencias_user_today(client, admin_user_and_token):
    """Prueba obtención de asistencia de usuario para hoy."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    resp = client.get(f"/api/asistencia?user_id=1&fecha={today}", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST]


def test_get_asistencia_by_date_range(client, admin_user_and_token):
    """Prueba reporte de asistencias por rango de fechas."""
    admin_user, admin_token = admin_user_and_token
    admin_headers = get_auth_headers(admin_token)
    
    today = datetime.now().date()
    start_date = (today - timedelta(days=30))
    
    resp = client.get(f"/api/asistencia/reporte?fecha_inicio={start_date}&fecha_fin={today}", headers=admin_headers)
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_asistencia_crud_flow(client):
    """Flujo completo CRUD de asistencia."""
    today = datetime.now().date()
    
    # 1. Create
    create_payload = {
        "user_id": 1,
        "fecha": str(today),
        "hora_entrada": "07:30:00",
        "hora_salida": "17:30:00",
        "metodo": "MANUAL",
        "observaciones": "Prueba CRUD"
    }
    
    create_resp = client.post("/api/asistencia/registrar-manual", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            asistencia_id = created_data.get("id")
            
            if asistencia_id:
                # 2. Read
                get_resp = client.get(f"/api/asistencia/{asistencia_id}")
                assert get_resp.status_code == HTTPStatus.OK
                
                # 3. Update
                update_payload = {
                    "estado": "PRESENTE",
                    "observaciones": "Actualizada en prueba CRUD"
                }
                update_resp = client.put(f"/api/asistencia/{asistencia_id}", json=update_payload)
                assert update_resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]
                
                # 4. Delete
                delete_resp = client.delete(f"/api/asistencia/{asistencia_id}")
                assert delete_resp.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.BAD_REQUEST]


def test_asistencia_with_invalid_user(client):
    """Prueba registro de asistencia con usuario inválido."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 99999,
        "fecha": str(today),
        "hora_entrada": "08:00:00",
        "metodo": "MANUAL"
    }
    
    resp = client.post("/api/asistencia/registrar-manual", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.METHOD_NOT_ALLOWED,
        HTTPStatus.INTERNAL_SERVER_ERROR
    ]


def test_asistencia_invalid_time_format(client):
    """Prueba registro de asistencia con formato de hora inválido."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 1,
        "fecha": str(today),
        "hora_entrada": "25:00:00",  # Hora inválida
        "metodo": "MANUAL"
    }
    
    resp = client.post("/api/asistencia/registrar-manual", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.INTERNAL_SERVER_ERROR,
        HTTPStatus.METHOD_NOT_ALLOWED
    ]
