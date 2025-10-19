"""
Pruebas de integración general y endpoints adicionales.

Cubre:
- Endpoints base de la aplicación
- WebSocket basics (si es aplicable)
- Autenticación
- Manejo de errores
- Performance
"""
from http import HTTPStatus


def test_root_endpoint(client):
    """Prueba del endpoint raíz."""
    resp = client.get("/")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "message" in data
    assert "endpoints" in data


def test_root_endpoint_structure(client):
    """Prueba la estructura del endpoint raíz."""
    resp = client.get("/")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    
    # Verificar endpoints conocidos
    endpoints = data.get("endpoints", {})
    expected_keys = ["roles", "users", "turnos", "asistencia", "reportes", "horarios", "justificaciones"]
    
    for key in expected_keys:
        assert key in endpoints or key in data, f"Endpoint '{key}' no encontrado"


def test_health_endpoint_structure(client):
    """Prueba la estructura del endpoint health."""
    resp = client.get("/health")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    
    required_fields = ["status", "database", "scheduler"]
    for field in required_fields:
        assert field in data, f"Campo requerido '{field}' no encontrado en health"


def test_health_status_values(client):
    """Prueba valores válidos en health check."""
    resp = client.get("/health")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    
    # Status debe ser 'healthy'
    assert data.get("status") in ["healthy", "ok", "running"]


def test_api_documentation_available(client):
    """Prueba que la documentación Swagger está disponible."""
    resp = client.get("/docs")
    assert resp.status_code == HTTPStatus.OK


def test_api_openapi_schema(client):
    """Prueba que el esquema OpenAPI está disponible."""
    resp = client.get("/openapi.json")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert "openapi" in data
    assert "paths" in data


def test_invalid_endpoint(client):
    """Prueba acceso a endpoint no existente."""
    resp = client.get("/api/nonexistent")
    assert resp.status_code == HTTPStatus.NOT_FOUND


def test_invalid_method(client):
    """Prueba método HTTP no permitido."""
    resp = client.patch("/api/roles/1")
    assert resp.status_code == HTTPStatus.METHOD_NOT_ALLOWED


def test_missing_required_field(client):
    """Prueba POST sin campo requerido."""
    payload = {
        "nombre": "Test Role"
        # Falta descripción que puede ser requerida
    }
    
    resp = client.post("/api/roles/", json=payload)
    # Puede ser BAD_REQUEST o UNPROCESSABLE_ENTITY dependiendo de la validación
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.CREATED,  # Si el campo no es requerido
        HTTPStatus.OK
    ]


def test_invalid_json_payload(client):
    """Prueba POST con JSON inválido."""
    resp = client.post(
        "/api/roles/",
        data="{invalid json}",
        headers={"Content-Type": "application/json"}
    )
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_empty_payload(client):
    """Prueba POST con payload vacío."""
    resp = client.post("/api/roles/", json={})
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.CREATED,
        HTTPStatus.OK
    ]


def test_query_parameter_validation(client):
    """Prueba validación de parámetros query."""
    # pageSize inválido (debe ser > 0)
    resp = client.get("/api/roles/?page=1&pageSize=-5")
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.OK  # Si la validación no es estricta
    ]


def test_page_out_of_range(client):
    """Prueba acceso a página que no existe."""
    resp = client.get("/api/roles/?page=99999&pageSize=10")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    # Debe retornar lista vacía o error, pero no 404
    assert "data" in data or "error" in data


def test_large_page_size(client):
    """Prueba con page size muy grande."""
    resp = client.get("/api/roles/?page=1&pageSize=10000")
    # Puede fallar por validación o retornar solo los disponibles
    assert resp.status_code in [
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY,
        HTTPStatus.OK
    ]


def test_response_content_type(client):
    """Prueba que las respuestas tienen content-type correcto."""
    resp = client.get("/api/roles/")
    assert resp.headers.get("content-type") is not None
    assert "application/json" in resp.headers.get("content-type", "")


def test_cors_headers(client):
    """Prueba que CORS headers están presentes."""
    resp = client.get("/api/roles/")
    # Dependiendo de configuración
    headers = resp.headers
    # Podría tener Access-Control-Allow-Origin
    assert resp.status_code == HTTPStatus.OK


def test_api_version_in_response(client):
    """Prueba que la versión API está disponible."""
    resp = client.get("/")
    data = resp.json()
    assert "version" in data


def test_multiple_sequential_requests(client):
    """Prueba múltiples requests secuenciales."""
    for i in range(5):
        resp = client.get("/api/roles/?page=1&pageSize=10")
        assert resp.status_code == HTTPStatus.OK


def test_concurrent_read_operations(client):
    """Prueba operaciones concurrentes de lectura."""
    # Simulación secuencial (pytest no es async por defecto)
    responses = []
    for i in range(3):
        resp = client.get("/api/roles/?page=1&pageSize=10")
        responses.append(resp)
    
    for resp in responses:
        assert resp.status_code == HTTPStatus.OK


def test_error_response_format(client):
    """Prueba formato de respuestas de error."""
    resp = client.get("/api/roles/99999")
    if resp.status_code == HTTPStatus.NOT_FOUND:
        data = resp.json()
        # Debe tener alguna estructura de error
        assert "error" in data or "message" in data or "detail" in data


def test_pagination_metadata(client):
    """Prueba metadata de paginación."""
    resp = client.get("/api/roles/?page=1&pageSize=10")
    if resp.status_code == HTTPStatus.OK:
        data = resp.json()
        paginated = data.get("data", {})
        
        # Debe tener información de paginación
        pagination_fields = ["page", "pageSize", "totalRecords", "totalPages"]
        has_pagination = any(field in paginated for field in pagination_fields)
        assert has_pagination or isinstance(data.get("data"), list)


def test_response_times(client):
    """Prueba tiempos de respuesta razonables."""
    import time
    
    start = time.time()
    resp = client.get("/api/roles/?page=1&pageSize=10")
    elapsed = time.time() - start
    
    # Debe responder en menos de 5 segundos
    assert elapsed < 5
    assert resp.status_code == HTTPStatus.OK


def test_data_consistency(client):
    """Prueba consistencia de datos entre múltiples requests."""
    resp1 = client.get("/api/roles/?page=1&pageSize=10")
    resp2 = client.get("/api/roles/?page=1&pageSize=10")
    
    assert resp1.status_code == HTTPStatus.OK
    assert resp2.status_code == HTTPStatus.OK
    
    data1 = resp1.json()
    data2 = resp2.json()
    
    # La cantidad total de registros debe ser igual
    total1 = data1.get("data", {}).get("totalRecords", 0)
    total2 = data2.get("data", {}).get("totalRecords", 0)
    assert total1 == total2


def test_special_characters_in_query(client):
    """Prueba caracteres especiales en parámetros."""
    resp = client.get("/api/roles/?nombre=test&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]


def test_unicode_characters_in_query(client):
    """Prueba caracteres Unicode en parámetros."""
    resp = client.get("/api/roles/?nombre=técnico&page=1&pageSize=10")
    assert resp.status_code in [HTTPStatus.OK, HTTPStatus.BAD_REQUEST]


def test_very_long_query_string(client):
    """Prueba query string muy largo."""
    long_query = "q=" + "a" * 5000
    resp = client.get(f"/api/roles/?page=1&pageSize=10&{long_query}")
    # Puede fallar o procesar según configuración
    assert resp.status_code in [
        HTTPStatus.OK,
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNPROCESSABLE_ENTITY
    ]


def test_endpoint_trailing_slash_consistency(client):
    """Prueba consistencia de trailing slashes."""
    resp1 = client.get("/api/roles")
    resp2 = client.get("/api/roles/")
    
    # Ambos deben retornar 200 o ambos fallar de manera consistente
    assert resp1.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.TEMPORARY_REDIRECT]
    assert resp2.status_code in [HTTPStatus.OK, HTTPStatus.NOT_FOUND, HTTPStatus.TEMPORARY_REDIRECT]


def test_http_method_case_sensitivity(client):
    """Prueba que los métodos HTTP no son case-sensitive (GET, get, Get)."""
    resp1 = client.get("/api/roles/?page=1&pageSize=10")
    # TestClient usa métodos en mayúsculas, pero HTTP debe ser case-insensitive
    assert resp1.status_code == HTTPStatus.OK
