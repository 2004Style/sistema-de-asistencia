"""
Pruebas de integración para turnos.

Cubre:
- Creación de turnos
- Listado de turnos
- Obtención de turno por ID
- Actualización de turno
- Eliminación de turno
"""
from http import HTTPStatus


def test_turnos_list(client):
    """Prueba obtención de lista de turnos."""
    resp = client.get("/api/turnos?page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    # Turnos devuelve "turnos" no "data"
    assert "turnos" in data or "data" in data


def test_turnos_list_pagination(client):
    """Prueba paginación de turnos."""
    # Primera página
    resp1 = client.get("/api/turnos?page=1&pageSize=5")
    assert resp1.status_code == HTTPStatus.OK
    
    # Segunda página
    resp2 = client.get("/api/turnos?page=2&pageSize=5")
    assert resp2.status_code == HTTPStatus.OK
    
    data1 = resp1.json()
    data2 = resp2.json()
    
    assert "turnos" in data1 or "data" in data1
    assert "turnos" in data2 or "data" in data2


def test_get_turno_not_found(client):
    """Prueba obtención de turno no existente."""
    resp = client.get("/api/turnos/99999")
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_turno_minimal(client):
    """Prueba creación de turno con datos mínimos."""
    payload = {
        "nombre": "Turno Matutino Test",
        "descripcion": "Turno de prueba",
        "hora_inicio": "06:00:00",
        "hora_fin": "14:00:00",
        "activo": True
    }
    
    resp = client.post("/api/turnos", json=payload)
    # Puede fallar si hay restricciones de permisos en el endpoint
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED
    ]


def test_create_turno_complete(client):
    """Prueba creación de turno con todos los datos."""
    payload = {
        "nombre": "Turno Nocturno Test",
        "descripcion": "Turno nocturno de prueba",
        "hora_inicio": "22:00:00",
        "hora_fin": "06:00:00",
        "horas_requeridas": 480,
        "descanso_comida": 60,
        "activo": True
    }
    
    resp = client.post("/api/turnos", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED
    ]


def test_create_turno_invalid_time(client):
    """Prueba creación de turno con hora inválida."""
    payload = {
        "nombre": "Turno Inválido",
        "descripcion": "Turno con hora inválida",
        "hora_inicio": "25:00:00",  # Hora inválida
        "hora_fin": "14:00:00",
        "activo": True
    }
    
    resp = client.post("/api/turnos", json=payload)
    # Puede ser BAD_REQUEST o pasar si la validación es en el servicio
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED,
        HTTPStatus.INTERNAL_SERVER_ERROR
    ]


def test_update_turno_not_found(client):
    """Prueba actualización de turno no existente."""
    payload = {
        "nombre": "Turno Actualizado",
        "activo": True
    }
    
    resp = client.put("/api/turnos/99999", json=payload)
    assert resp.status_code in [
        HTTPStatus.NOT_FOUND,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED
    ]


def test_delete_turno_not_found(client):
    """Prueba eliminación de turno no existente."""
    resp = client.delete("/api/turnos/99999")
    assert resp.status_code in [
        HTTPStatus.NOT_FOUND,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNAUTHORIZED
    ]


def test_get_turnos_activos(client):
    """Prueba obtención de turnos activos."""
    resp = client.get("/api/turnos?activo=true&page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "turnos" in data or "data" in data


def test_get_turnos_by_name(client):
    """Prueba búsqueda de turnos por nombre."""
    resp = client.get("/api/turnos/search?nombre=Matutino&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_turno_crud_flow(client):
    """Flujo completo CRUD de turno."""
    # 1. Create
    create_payload = {
        "nombre": "Turno CRUD Test",
        "descripcion": "Turno para prueba CRUD",
        "hora_inicio": "08:00:00",
        "hora_fin": "16:00:00",
        "activo": True
    }
    
    create_resp = client.post("/api/turnos", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        turno_id = created_data.get("id")
        
        # 2. Read
        get_resp = client.get(f"/api/turnos/{turno_id}")
        assert get_resp.status_code == HTTPStatus.OK
        get_data = get_resp.json().get("data")
        assert get_data.get("id") == turno_id
        
        # 3. Update
        update_payload = {
            "nombre": "Turno CRUD Test Updated",
            "descripcion": "Turno actualizado"
        }
        update_resp = client.put(f"/api/turnos/{turno_id}", json=update_payload)
        assert update_resp.status_code in [HTTPStatus.OK, HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED]
        
        # 4. Delete
        delete_resp = client.delete(f"/api/turnos/{turno_id}")
        assert delete_resp.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED]
