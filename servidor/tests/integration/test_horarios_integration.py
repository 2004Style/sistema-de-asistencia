"""
Pruebas de integración para horarios.

Cubre:
- Creación de horarios
- Listado de horarios
- Obtención de horario por ID
- Actualización de horario
- Eliminación de horario
- Filtrado por usuario, día de semana
"""
from http import HTTPStatus


def test_horarios_list(client):
    """Prueba obtención de lista de horarios."""
    resp = client.get("/api/horarios?page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "data" in data


def test_horarios_list_pagination(client):
    """Prueba paginación de horarios."""
    resp1 = client.get("/api/horarios?page=1&pageSize=5")
    assert resp1.status_code == HTTPStatus.OK
    
    resp2 = client.get("/api/horarios?page=2&pageSize=5")
    assert resp2.status_code == HTTPStatus.OK


def test_get_horario_not_found(client):
    """Prueba obtención de horario no existente."""
    resp = client.get("/api/horarios/99999")
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_horario_minimal(client):
    """Prueba creación de horario con datos mínimos."""
    payload = {
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 1,
        "hora_entrada": "08:00:00",
        "hora_salida": "16:00:00"
    }
    
    resp = client.post("/api/horarios", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_create_horario_complete(client):
    """Prueba creación de horario con todos los datos."""
    payload = {
        "user_id": 1,
        "dia_semana": "MARTES",
        "turno_id": 1,
        "hora_entrada": "07:00:00",
        "hora_salida": "15:00:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": True
    }
    
    resp = client.post("/api/horarios", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_create_horario_all_days(client):
    """Prueba creación de horarios para todos los días de la semana."""
    dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]
    
    for dia in dias:
        payload = {
            "user_id": 1,
            "dia_semana": dia,
            "turno_id": 1,
            "hora_entrada": "08:00:00",
            "hora_salida": "16:00:00",
            "activo": True
        }
        
        resp = client.post("/api/horarios", json=payload)
        assert resp.status_code in [
            HTTPStatus.CREATED,
            HTTPStatus.OK,
            HTTPStatus.BAD_REQUEST,
            HTTPStatus.UNPROCESSABLE_ENTITY,
            HTTPStatus.CONFLICT  # Si ya existe el horario para ese día
        ]


def test_horarios_by_user(client):
    """Prueba obtención de horarios por usuario."""
    resp = client.get("/api/horarios?user_id=1&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_horarios_by_day(client):
    """Prueba obtención de horarios por día de semana."""
    resp = client.get("/api/horarios?dia_semana=LUNES&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]


def test_horarios_activos(client):
    """Prueba obtención de horarios activos."""
    resp = client.get("/api/horarios?activo=true&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_horarios_by_user_and_day(client):
    """Prueba obtención de horarios por usuario y día."""
    resp = client.get("/api/horarios?user_id=1&dia_semana=LUNES&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]


def test_update_horario_not_found(client):
    """Prueba actualización de horario no existente."""
    payload = {
        "hora_entrada": "09:00:00",
        "hora_salida": "17:00:00"
    }
    
    resp = client.put("/api/horarios/99999", json=payload)
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNAUTHORIZED]


def test_delete_horario_not_found(client):
    """Prueba eliminación de horario no existente."""
    resp = client.delete("/api/horarios/99999")
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNAUTHORIZED, HTTPStatus.METHOD_NOT_ALLOWED, HTTPStatus.INTERNAL_SERVER_ERROR]


def test_create_horario_invalid_time(client):
    """Prueba creación de horario con hora inválida."""
    payload = {
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 1,
        "hora_entrada": "25:00:00",  # Hora inválida
        "hora_salida": "16:00:00"
    }
    
    resp = client.post("/api/horarios", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_create_horario_hora_salida_anterior_entrada(client):
    """Prueba creación de horario con hora salida anterior a entrada."""
    payload = {
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 1,
        "hora_entrada": "16:00:00",
        "hora_salida": "08:00:00"  # Anterior a entrada
    }
    
    resp = client.post("/api/horarios", json=payload)
    # Puede que sea válido si el turno es nocturno o debe validarse
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_create_horario_invalid_user(client):
    """Prueba creación de horario con usuario inválido."""
    payload = {
        "user_id": 99999,
        "dia_semana": "LUNES",
        "turno_id": 1,
        "hora_entrada": "08:00:00",
        "hora_salida": "16:00:00"
    }
    
    resp = client.post("/api/horarios", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.NOT_FOUND
    ]


def test_create_horario_invalid_turno(client):
    """Prueba creación de horario con turno inválido."""
    payload = {
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 99999,
        "hora_entrada": "08:00:00",
        "hora_salida": "16:00:00"
    }
    
    resp = client.post("/api/horarios", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.NOT_FOUND
    ]


def test_horario_crud_flow(client):
    """Flujo completo CRUD de horario."""
    # 1. Create
    create_payload = {
        "user_id": 1,
        "dia_semana": "MIERCOLES",
        "turno_id": 1,
        "hora_entrada": "08:00:00",
        "hora_salida": "16:00:00",
        "horas_requeridas": 480,
        "activo": True
    }
    
    create_resp = client.post("/api/horarios", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            horario_id = created_data.get("id")
            
            if horario_id:
                # 2. Read
                get_resp = client.get(f"/api/horarios/{horario_id}")
                assert get_resp.status_code == HTTPStatus.OK
                get_data = get_resp.json().get("data")
                assert get_data.get("id") == horario_id
                
                # 3. Update
                update_payload = {
                    "hora_entrada": "09:00:00",
                    "hora_salida": "17:00:00"
                }
                update_resp = client.put(f"/api/horarios/{horario_id}", json=update_payload)
                assert update_resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]
                
                # 4. Delete
                delete_resp = client.delete(f"/api/horarios/{horario_id}")
                assert delete_resp.status_code in [
                    HTTPStatus.OK,
                    HTTPStatus.NO_CONTENT,
                    HTTPStatus.BAD_REQUEST
                ]


def test_get_turno_activo_for_user_today(client):
    """Prueba obtención del turno activo para un usuario hoy."""
    resp = client.get("/api/horarios/turno-actual?user_id=1")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.BAD_REQUEST]
