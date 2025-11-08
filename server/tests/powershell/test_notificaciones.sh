#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8000/api/notificaciones"
USER_API="http://localhost:8000/api/users"
ADMIN_EMAIL="rubencithochavez036@gmail.com"

print(){ echo "\n$1"; }
ok(){ echo "[OK] $1"; }
fail(){ echo "[FAIL] $1"; exit 1; }

# 0) Obtener admin id
print "Buscar admin por email"
user_resp=$(curl -sS "$USER_API/?search=${ADMIN_EMAIL}&page=1&pageSize=1")
ADMIN_ID=$(echo "$user_resp" | jq -r '.data.records[0].id')
if [[ -z "$ADMIN_ID" || "$ADMIN_ID" == "null" ]]; then fail "No se encontró Admin"; fi
ok "Admin ID: $ADMIN_ID"

# 1) Crear notificaciones directamente en la base usando un pequeño script python (usa el entorno del proyecto)
print "Crear notificaciones en DB via python"
/home/ronald/Documentos/projects-multilenguajes/sistema-de-asistencia/server/venv/bin/python - <<PY
import asyncio
from src.config.database import get_db
from src.notificaciones.service import notificacion_service
from src.notificaciones.model import TipoNotificacion, PrioridadNotificacion
from datetime import date

# Import related models to ensure SQLAlchemy mappers are configured
import src.horarios.model as _horarios_model
import src.users.model as _users_model
import src.turnos.model as _turnos_model
import src.asistencias.model as _asistencias_model
import src.justificaciones.model as _justificaciones_model

db = next(get_db())

async def make_notifications(user_id: int):
  # Crear 2 no leidas
  await notificacion_service.crear_notificacion(
    db=db,
    user_id=user_id,
    tipo=TipoNotificacion.TARDANZA,
    titulo="Tardanza de prueba",
    mensaje="Has llegado tarde de prueba",
    datos_adicionales={"test": True},
    prioridad=PrioridadNotificacion.MEDIA
  )
  await notificacion_service.crear_notificacion(
    db=db,
    user_id=user_id,
    tipo=TipoNotificacion.AUSENCIA,
    titulo="Ausencia de prueba",
    mensaje="Ausencia de prueba",
    datos_adicionales={"test": True},
    prioridad=PrioridadNotificacion.ALTA
  )

  # Crear 1 ya leida (marcamos después)
  n = await notificacion_service.crear_notificacion(
    db=db,
    user_id=user_id,
    tipo=TipoNotificacion.SISTEMA,
    titulo="Sistema - prueba",
    mensaje="Notificación de sistema de prueba",
    datos_adicionales={"test": True},
    prioridad=PrioridadNotificacion.BAJA
  )
  # Marcar la tercera como leida
  n.leida = True
  from datetime import datetime
  n.fecha_lectura = datetime.utcnow()
  db.commit()

asyncio.run(make_notifications(int(${ADMIN_ID})))
PY

echo "Notificaciones creadas en base de datos"

# 2) Listar notificaciones (esperamos >=1)
print "Listar notificaciones"
resp=$(curl -sS "$BASE_URL/")
if ! echo "$resp" | jq -e '.notificaciones' >/dev/null 2>&1; then
  echo "Listado falló: $resp"; fail "Listar notificaciones failed"
fi
count=$(echo "$resp" | jq -r '.total')
ok "Listadas $count notificaciones"

# 3) Contar no leidas
print "Contar notificaciones no leídas"
resp=$(curl -sS "$BASE_URL/count")
count=$(echo "$resp" | jq -r '.count')
ok "No leídas: $count"

# 4) Tomar primera notificacion id y probar GET, marcar leida
print "Obtener primer id y marcar como leída"
first_id=$(curl -sS "$BASE_URL/" | jq -r '.notificaciones[0].id')
if [[ -z "$first_id" || "$first_id" == "null" ]]; then fail "No hay notificaciones para probar"; fi
resp=$(curl -sS "$BASE_URL/$first_id")
if ! echo "$resp" | jq -e '.id' >/dev/null 2>&1; then echo "GET por id falló: $resp"; fail "GET id failed"; fi
curl -sS -X PUT "$BASE_URL/$first_id/marcar-leida" -o /dev/null
resp=$(curl -sS "$BASE_URL/count")
newcount=$(echo "$resp" | jq -r '.count')
ok "Marcar leída OK; nueva no leidas: $newcount"

# 5) Marcar todas como leídas
print "Marcar todas como leídas"
resp=$(curl -sS -X PUT "$BASE_URL/marcar-todas-leidas")
if ! echo "$resp" | jq -e '.count' >/dev/null 2>&1; then echo "Marcar todas falló: $resp"; fail "Marcar todas failed"; fi
ok "Marcar todas OK"

# 6) Limpiar antiguas (solo admin) - requiere permisos admin
print "Limpiar antiguas (admin)"
resp=$(curl -sS -X DELETE "$BASE_URL/limpiar?dias=1")
if ! echo "$resp" | jq -e '.count' >/dev/null 2>&1; then echo "Limpiar falló: $resp"; fail "Limpiar failed"; fi
ok "Limpiar antiguas OK: $(echo $resp | jq -r '.count')"

print "Tests de notificaciones (parcial) completados"
exit 0
