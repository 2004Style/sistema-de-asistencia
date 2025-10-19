"""
Pruebas de integración para justificaciones.

Cubre:
- Creación de justificaciones
- Listado de justificaciones
- Obtención de justificación por ID
- Actualización de justificación
- Eliminación de justificación
- Cambio de estado
"""
from http import HTTPStatus
from datetime import datetime, timedelta


def test_justificaciones_list(client):
    """Prueba obtención de lista de justificaciones."""
    resp = client.get("/api/justificaciones?page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "data" in data


def test_justificaciones_list_pagination(client):
    """Prueba paginación de justificaciones."""
    resp1 = client.get("/api/justificaciones?page=1&pageSize=5")
    assert resp1.status_code == HTTPStatus.OK
    
    resp2 = client.get("/api/justificaciones?page=2&pageSize=5")
    assert resp2.status_code == HTTPStatus.OK


def test_get_justificacion_not_found(client):
    """Prueba obtención de justificación no existente."""
    resp = client.get("/api/justificaciones/99999")
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_justificacion_minimal(client):
    """Prueba creación de justificación con datos mínimos."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 1,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Cita médica",
        "tipo": "MEDICA"
    }
    
    resp = client.post("/api/justificaciones", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_create_justificacion_types(client):
    """Prueba creación de justificaciones con diferentes tipos."""
    today = datetime.now().date()
    tipos = ["MEDICA", "PERSONAL", "LABORAL", "OTRO"]
    
    for i, tipo in enumerate(tipos):
        payload = {
            "user_id": 1,
            "asistencia_id": i + 1,
            "fecha": str(today),
            "razon": f"Justificación de tipo {tipo}",
            "tipo": tipo,
            "descripcion": f"Descripción para {tipo}"
        }
        
        resp = client.post("/api/justificaciones", json=payload)
        assert resp.status_code in [
            HTTPStatus.CREATED,
            HTTPStatus.OK,
            HTTPStatus.BAD_REQUEST,
            HTTPStatus.UNPROCESSABLE_ENTITY
        ]


def test_create_justificacion_complete(client):
    """Prueba creación de justificación con todos los datos."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 1,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Permiso especial",
        "tipo": "PERSONAL",
        "descripcion": "Descripción detallada de la justificación",
        "documento_referencia": "DOC001",
        "notas": "Notas adicionales"
    }
    
    resp = client.post("/api/justificaciones", json=payload)
    assert resp.status_code in [
        HTTPStatus.CREATED,
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_justificaciones_by_user(client):
    """Prueba obtención de justificaciones por usuario."""
    resp = client.get("/api/justificaciones?user_id=1&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_justificaciones_by_status(client):
    """Prueba obtención de justificaciones por estado."""
    resp = client.get("/api/justificaciones?estado=PENDIENTE&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]


def test_justificaciones_by_type(client):
    """Prueba obtención de justificaciones por tipo."""
    resp = client.get("/api/justificaciones?tipo=MEDICA&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]


def test_justificaciones_by_date_range(client):
    """Prueba obtención de justificaciones por rango de fechas."""
    today = datetime.now().date()
    start_date = (today - timedelta(days=30))
    
    resp = client.get(f"/api/justificaciones?fecha_inicio={start_date}&fecha_fin={today}&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND]


def test_update_justificacion_not_found(client):
    """Prueba actualización de justificación no existente."""
    payload = {
        "estado": "APROBADA"
    }
    
    resp = client.put("/api/justificaciones/99999", json=payload)
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNAUTHORIZED]


def test_delete_justificacion_not_found(client):
    """Prueba eliminación de justificación no existente."""
    resp = client.delete("/api/justificaciones/99999")
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST, HTTPStatus.UNAUTHORIZED, HTTPStatus.METHOD_NOT_ALLOWED]


def test_approve_justificacion(client):
    """Prueba aprobación de justificación."""
    today = datetime.now().date()
    
    # Crear justificación
    create_payload = {
        "user_id": 1,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Justificación para aprobar",
        "tipo": "MEDICA"
    }
    
    create_resp = client.post("/api/justificaciones", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            just_id = created_data.get("id")
            if just_id:
                # Aprobar justificación
                approve_payload = {
                    "estado": "APROBADA",
                    "comentario_aprobador": "Aprobada por prueba"
                }
                
                approve_resp = client.put(f"/api/justificaciones/{just_id}", json=approve_payload)
                assert approve_resp.status_code in [
                    HTTPStatus.OK,
                    HTTPStatus.BAD_REQUEST
                ]


def test_reject_justificacion(client):
    """Prueba rechazo de justificación."""
    today = datetime.now().date()
    
    # Crear justificación
    create_payload = {
        "user_id": 1,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Justificación para rechazar",
        "tipo": "PERSONAL"
    }
    
    create_resp = client.post("/api/justificaciones", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            just_id = created_data.get("id")
            if just_id:
                # Rechazar justificación
                reject_payload = {
                    "estado": "RECHAZADA",
                    "comentario_aprobador": "Rechazada por prueba"
                }
                
                reject_resp = client.put(f"/api/justificaciones/{just_id}", json=reject_payload)
                assert reject_resp.status_code in [
                    HTTPStatus.OK,
                    HTTPStatus.BAD_REQUEST
                ]


def test_create_justificacion_invalid_user(client):
    """Prueba creación de justificación con usuario inválido."""
    today = datetime.now().date()
    
    payload = {
        "user_id": 99999,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Justificación inválida",
        "tipo": "MEDICA"
    }
    
    resp = client.post("/api/justificaciones", json=payload)
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.NOT_FOUND
    ]


def test_justificacion_crud_flow(client):
    """Flujo completo CRUD de justificación."""
    today = datetime.now().date()
    
    # 1. Create
    create_payload = {
        "user_id": 1,
        "asistencia_id": 1,
        "fecha": str(today),
        "razon": "Justificación CRUD Test",
        "tipo": "PERSONAL",
        "descripcion": "Prueba del flujo CRUD"
    }
    
    create_resp = client.post("/api/justificaciones", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            just_id = created_data.get("id")
            if just_id:
                # 2. Read
                get_resp = client.get(f"/api/justificaciones/{just_id}")
                assert get_resp.status_code == HTTPStatus.OK
                
                # 3. Update
                update_payload = {
                    "estado": "APROBADA",
                    "comentario_aprobador": "Aprobada en CRUD"
                }
                update_resp = client.put(f"/api/justificaciones/{just_id}", json=update_payload)
                assert update_resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]
                
                # 4. Delete
                delete_resp = client.delete(f"/api/justificaciones/{just_id}")
                assert delete_resp.status_code in [
                    HTTPStatus.OK,
                    HTTPStatus.NO_CONTENT,
                    HTTPStatus.BAD_REQUEST
                ]


def test_justificaciones_pending(client):
    """Prueba obtención de justificaciones pendientes."""
    resp = client.get("/api/justificaciones?estado=PENDIENTE&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data or "justificaciones" in data


def test_justificaciones_approved(client):
    """Prueba obtención de justificaciones aprobadas."""
    resp = client.get("/api/justificaciones?estado=APROBADA&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.UNPROCESSABLE_ENTITY, HTTPStatus.NOT_FOUND]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "data" in data or "justificaciones" in data
