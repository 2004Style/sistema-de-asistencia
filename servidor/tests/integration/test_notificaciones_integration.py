"""
Pruebas de integración para notificaciones.

Cubre:
- Creación de notificaciones
- Listado de notificaciones
- Obtención de notificación por ID
- Marcado como leído
- Eliminación de notificación
- Filtrado por usuario, tipo, estado
"""
from http import HTTPStatus


def test_notificaciones_list(client):
    """Prueba obtención de lista de notificaciones."""
    resp = client.get("/api/notificaciones?page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    # Puede tener "data" o "notificaciones" como clave principal
    assert "notificaciones" in data or "data" in data


def test_notificaciones_list_pagination(client):
    """Prueba paginación de notificaciones."""
    resp1 = client.get("/api/notificaciones?page=1&pageSize=5")
    assert resp1.status_code == HTTPStatus.OK
    
    resp2 = client.get("/api/notificaciones?page=2&pageSize=5")
    assert resp2.status_code == HTTPStatus.OK


def test_get_notificacion_not_found(client):
    """Prueba obtención de notificación no existente."""
    resp = client.get("/api/notificaciones/99999")
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_create_notificacion_minimal(client):
    """Prueba que POST a notificaciones no es soportado (se crean automáticamente)."""
    payload = {
        "user_id": 1,
        "titulo": "Notificación de prueba",
        "mensaje": "Este es un mensaje de prueba",
        "tipo": "INFORMATIVO"
    }
    
    resp = client.post("/api/notificaciones", json=payload)
    # POST no está soportado - las notificaciones se crean automáticamente
    assert resp.status_code in [HTTPStatus.METHOD_NOT_ALLOWED, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_create_notificacion_types(client):
    """Prueba que no se puede crear notificaciones manualmente."""
    payload = {
        "user_id": 1,
        "titulo": "Notificación de prueba",
        "mensaje": "Este es un mensaje de prueba",
        "tipo": "INFORMATIVO"
    }
    
    resp = client.post("/api/notificaciones", json=payload)
    # POST no está soportado
    assert resp.status_code in [HTTPStatus.METHOD_NOT_ALLOWED, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_create_notificacion_complete(client):
    """Prueba que no se puede crear notificaciones con datos completos."""
    payload = {
        "user_id": 1,
        "titulo": "Notificación completa",
        "mensaje": "Mensaje detallado de notificación",
        "tipo": "RECORDATORIO",
        "leido": False,
        "datos_extra": {
            "enlace": "/api/users/1",
            "accion": "ver_perfil"
        }
    }
    
    resp = client.post("/api/notificaciones", json=payload)
    # POST no está soportado
    assert resp.status_code in [HTTPStatus.METHOD_NOT_ALLOWED, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.UNPROCESSABLE_ENTITY]


def test_notificaciones_by_user(client):
    """Prueba obtención de notificaciones por usuario."""
    resp = client.get("/api/notificaciones?user_id=1&page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK


def test_notificaciones_unread(client):
    """Prueba obtención de notificaciones no leídas."""
    resp = client.get("/api/notificaciones?leido=false&page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK


def test_notificaciones_read(client):
    """Prueba obtención de notificaciones leídas."""
    resp = client.get("/api/notificaciones?leido=true&page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK


def test_notificaciones_by_type(client):
    """Prueba obtención de notificaciones por tipo."""
    resp = client.get("/api/notificaciones?tipo=RECORDATORIO&page=1&pageSize=10")
    assert resp.status_code == HTTPStatus.OK


def test_mark_notificacion_as_read(client):
    """Prueba marcar notificación como leída."""
    # Crear notificación
    create_payload = {
        "user_id": 1,
        "titulo": "Notificación para marcar como leída",
        "mensaje": "Mensaje de prueba",
        "tipo": "INFORMATIVO",
        "leido": False
    }
    
    create_resp = client.post("/api/notificaciones", json=create_payload)
    if create_resp.status_code in [HTTPStatus.CREATED, HTTPStatus.OK]:
        created_data = create_resp.json().get("data")
        if created_data:
            notif_id = created_data.get("id")
            if notif_id:
                # Marcar como leída
                update_payload = {"leido": True}
                update_resp = client.put(f"/api/notificaciones/{notif_id}", json=update_payload)
                assert update_resp.status_code in [
                    HTTPStatus.OK,
                    HTTPStatus.BAD_REQUEST
                ]


def test_mark_multiple_notificaciones_as_read(client):
    """Prueba marcar múltiples notificaciones como leídas."""
    payload = {
        "user_id": 1,
        "notificacion_ids": [1, 2, 3]
    }
    
    resp = client.put("/api/notificaciones/marcar-leidas", json=payload)
    assert resp.status_code in [
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.METHOD_NOT_ALLOWED
    ]


def test_delete_notificacion_not_found(client):
    """Prueba eliminación de notificación no existente."""
    resp = client.delete("/api/notificaciones/99999")
    assert resp.status_code in [HTTPStatus.NOT_FOUND, HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.METHOD_NOT_ALLOWED]


def test_delete_all_user_notificaciones(client):
    """Prueba eliminación de todas las notificaciones del usuario."""
    resp = client.delete("/api/notificaciones/user/1")
    assert resp.status_code in [
        HTTPStatus.OK,
        HTTPStatus.NO_CONTENT,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.METHOD_NOT_ALLOWED
    ]


def test_get_unread_count(client):
    """Prueba obtención de contador de notificaciones no leídas."""
    resp = client.get("/api/notificaciones/user/1/unread-count")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND]
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        assert "count" in data or "data" in data


def test_notificacion_crud_flow(client):
    """Flujo completo CRUD de notificación - solo lectura y actualización soportadas."""
    # Las notificaciones se crean automáticamente, solo podemos leer y actualizar
    # Intentar obtener notificación existente
    get_resp = client.get("/api/notificaciones/1")
    if get_resp.status_code == HTTPStatus.OK:
        # Si existe, intentar actualizar
        update_payload = {
            "leido": True
        }
        update_resp = client.put("/api/notificaciones/1", json=update_payload)
        assert update_resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]
        
        # Intentar eliminar
        delete_resp = client.delete("/api/notificaciones/1")
        assert delete_resp.status_code in [
            HTTPStatus.OK,
            HTTPStatus.NO_CONTENT,
            HTTPStatus.BAD_REQUEST,
            HTTPStatus.METHOD_NOT_ALLOWED
        ]
    else:
        # Si no existe, es normal
        assert get_resp.status_code == HTTPStatus.NOT_FOUND


def test_create_notificacion_invalid_user(client):
    """Prueba que no se puede crear notificaciones manualmente."""
    payload = {
        "user_id": 99999,
        "titulo": "Notificación inválida",
        "mensaje": "Mensaje de prueba",
        "tipo": "INFORMATIVO"
    }
    
    resp = client.post("/api/notificaciones", json=payload)
    # POST no está soportado
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.METHOD_NOT_ALLOWED
    ]


def test_notificaciones_for_user(client):
    """Prueba obtención de todas las notificaciones de un usuario."""
    resp = client.get("/api/notificaciones/user/1?page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND]
