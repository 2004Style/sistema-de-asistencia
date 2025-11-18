from src.socketsio.socketio_app import sio
from src.config.database import SessionLocal
from src.users.service import user_service
from src.asistencias.service import asistencia_service
from fastapi import HTTPException
import json
from datetime import datetime
import uuid
import asyncio

# ============================================================
# REGISTRO DE ACKs PENDIENTES (message_id -> Future)
# ============================================================
pending_acks = {}  # message_id -> {event: asyncio.Event, received_at: timestamp}
ACK_TIMEOUT = 5  # segundos para esperar ACK del sensor
MAX_RETRIES = 3  # máximo de reintentos


@sio.event
async def connect(sid, environ, auth=None):
    try:
        print("\n==============================")
        print(f"🔗 [SOCKET.IO] Cliente conectado! SID: {sid}")
        # mostrar un resumen corto del auth y environ para debug
        try:
            print(f"Auth: {json.dumps(auth, ensure_ascii=False) if auth else auth}")
        except Exception:
            print(f"Auth (no serializable): {repr(auth)}")
        print(f"Remote addr: {environ.get('REMOTE_ADDR') if isinstance(environ, dict) else repr(environ)}")
        print("==============================\n")
    except Exception as e:
        print(f"Error en connect handler: {e}")


@sio.event
async def disconnect(sid):
    try:
        print(f"🔌 [SOCKET.IO] Cliente desconectado. SID: {sid}")
    except Exception as e:
        print(f"Error en disconnect handler: {e}")


@sio.event
async def identify(sid, data):
    """
    Evento para que clientes se identifiquen: sensores deben enviar
    {"role":"sensor","sensor_id":"<id>"}
    Se les añadirá a la room `sensor:{sensor_id}` y a la room `sensors`.
    """
    try:
        print(f"[identify] SID: {sid} - payload: {json.dumps(data, ensure_ascii=False) if isinstance(data, dict) else repr(data)}")
        role = data.get("role") if isinstance(data, dict) else None
        sensor_id = data.get("sensor_id") if isinstance(data, dict) else None
        if role == "sensor" and sensor_id:
            # sensor se une a rooms para poder recibir mensajes dirigidos
            await sio.enter_room(sid, f"sensor:{sensor_id}")
            await sio.enter_room(sid, "sensors")
            await sio.emit("identified", {"status": "ok", "sensor_id": sensor_id}, to=sid)
            print(f"[identify] Sensor identificado y unido a rooms: sensor:{sensor_id}")
            # DEBUG: imprimir rooms del SID y miembros en la room 'sensors' para diagnosticar entregas
            try:
                sid_rooms = None
                try:
                    sid_rooms = sio.rooms(sid)
                except Exception:
                    # algunos bindings exponen rooms como coroutine o atributo; intentar sin await
                    try:
                        sid_rooms = await sio.rooms(sid)
                    except Exception:
                        sid_rooms = None

                print(f"[identify][debug] rooms para SID {sid}: {sid_rooms}")

                mgr = getattr(sio, "manager", None)
                members = None
                if mgr is not None:
                    # manager.rooms es un dict: namespace -> { room_name: set(sids) }
                    try:
                        ns_rooms = getattr(mgr, "rooms", None) or mgr.rooms
                        if isinstance(ns_rooms, dict):
                            members = ns_rooms.get("/", {}).get("sensors")
                    except Exception:
                        try:
                            members = mgr.rooms.get("/", {}).get("sensors")
                        except Exception:
                            members = None

                print(f"[identify][debug] miembros actualmente en room 'sensors': {members}")
            except Exception as e:
                print(f"[identify][debug] fallo al inspeccionar rooms: {e}")
        else:
            # clientes normales no requieren identificarse, pero pueden hacerlo
            await sio.emit("identified", {"status": "ok"}, to=sid)
            print(f"[identify] Cliente identificado sin rol sensor. SID: {sid}")
    except Exception as e:
        print(f"Error en identify: {e}")


@sio.on("sensor-ack")
@sio.event
async def sensor_ack(sid, data):
    """
    Evento de ACK (confirmación de recepción) del ESP32.
    El sensor confirma que recibió la solicitud.
    
    data expected: {tipo: "sensor-ack", message_id: str, client_sid: str, status: "recibido"}
    """
    try:
        if not isinstance(data, dict):
            return
        
        message_id = data.get("message_id")
        client_sid = data.get("client_sid")
        status = data.get("status")
        
        if not message_id:
            return
        
        print(f"\n[sensor-ack] ✓ ACK RECIBIDO DEL SENSOR")
        print(f"  Sensor SID: {sid}")
        print(f"  Message ID: {message_id}")
        print(f"  Cliente: {client_sid}")
        print(f"  Status: {status}")
        
        # Marcar como recibido y desbloquear espera
        if message_id in pending_acks:
            pending_acks[message_id]["event"].set()
            print(f"[sensor-ack] ✓ ACK registrado - desbloqueando espera")
        else:
            print(f"[sensor-ack] ⚠️ ACK recibido pero message_id no está en espera")
    
    except Exception as e:
        print(f"Error en sensor_ack: {e}")


@sio.on("sensor-cancel-request")
@sio.event
async def sensor_cancel_request(sid, data):
    """
    Evento de CANCELACIÓN en tiempo real.
    El cliente web solicita cancelar una operación de sensor.
    
    data expected: {tipo: "cancelar", client_sid: str, user_id: int, codigo: str}
    """
    try:
        if not isinstance(data, dict):
            return
        
        client_sid = data.get("client_sid")
        user_id = data.get("user_id")
        codigo = data.get("codigo")
        operation_id = data.get("operation_id")  # 🔑 ID de operación
        
        print(f"\n[sensor-cancel-request] ⚠️ CANCELACIÓN SOLICITADA")
        print(f"  Cliente Web SID: {sid}")
        print(f"  Client SID (para ESP32): {client_sid}")
        print(f"  Usuario: {user_id} | Código: {codigo}")
        print(f"  Operation ID: {operation_id}")
        
        # Preparar mensaje de cancelación para el ESP32
        cancel_data = {
            "tipo": "cancelar",
            "user_id": user_id,
            "codigo": codigo,
            "client_sid": client_sid,
            "operation_id": operation_id,  # 🔑 Propagar operation_id
            "timestamp": datetime.now().isoformat()
        }
        
        # ✅ ENVIAR CANCELACIÓN DIRECTAMENTE A TODOS LOS SENSORES (sin demora)
        # Primero a room 'sensors' (broadcast inmediato a todos)
        print(f"[sensor-cancel-request] Emitiendo 'sensor-cancel' a room 'sensors'...")
        print(f"[sensor-cancel-request] Payload: {json.dumps(cancel_data, ensure_ascii=False)}")
        await sio.emit("sensor-cancel", cancel_data, room="sensors")
        print(f"[sensor-cancel-request] ✓ Emitido a 'sensors' (broadcast)")
        print(f"[sensor-cancel-request] DEBUG: Miembros en room 'sensors':")
        
        # Debug: Mostrar miembros en room sensors
        try:
            mgr = getattr(sio, "manager", None)
            if mgr:
                ns_rooms = getattr(mgr, "rooms", None)
                if ns_rooms and "/" in ns_rooms:
                    members = ns_rooms["/"].get("sensors", set())
                    print(f"[sensor-cancel-request] DEBUG: {members}")
        except Exception as e:
            print(f"[sensor-cancel-request] DEBUG error: {e}")
        
        # También emitir a la room específica del sensor si existe
        if client_sid:
            print(f"[sensor-cancel-request] También emitiendo a 'sensor:esp32-1'...")
            await sio.emit("sensor-cancel", cancel_data, room="sensor:esp32-1")
            print(f"[sensor-cancel-request] ✓ Emitido a 'sensor:esp32-1'")
        
        # Confirmar al cliente que se envió la cancelación con su SID
        await sio.emit("client-response", {
            "tipo": "cancelar",
            "user_id": user_id,
            "codigo": codigo,
            "client_sid": client_sid,
            "asistencia": "cancelled",
            "message": "Cancelación enviada al sensor",
            "timestamp": datetime.now().isoformat()
        }, to=sid)
        
        print(f"[sensor-cancel-request] ✓ Cancelación reenviada a ESP32 - OK\n")
        
    except Exception as e:
        print(f"Error en sensor_cancel_request: {e}")


@sio.on("sensor-cancel-ack")
@sio.event
async def sensor_cancel_ack(sid, data):
    """
    ACK del ESP32 confirmando que procesó la cancelación.
    Esto permite confirmar al cliente que la cancelación fue procesada.
    
    ⚠️ IMPORTANTE: Solo reenviar si el operation_id coincide con la operación actual del cliente.
    """
    try:
        if not isinstance(data, dict):
            return
        
        client_sid = data.get("client_sid")
        status = data.get("status")
        operation_id = data.get("operation_id")  # 🔑 ID de operación
        
        print(f"\n[sensor-cancel-ack] ✓ ESP32 confirmó cancelación")
        print(f"  Client SID: {client_sid}")
        print(f"  Status: {status}")
        print(f"  Operation ID: {operation_id}")
        
        # Reenviar confirmación al cliente web si tenemos su SID
        # ✅ Incluir operation_id para que el cliente pueda filtrar si no corresponde
        if client_sid:
            await sio.emit("client-response", {
                "tipo": "cancelacion_confirmada",
                "client_sid": client_sid,
                "operation_id": operation_id,  # 🔑 Propagar operation_id
                "asistencia": "cancelled",
                "message": "Cancelación confirmada por sensor",
                "timestamp": datetime.now().isoformat()
            }, to=client_sid)
            print(f"[sensor-cancel-ack] ✓ Confirmación enviada al cliente {client_sid} (operation: {operation_id})")
        
    except Exception as e:
        print(f"Error en sensor_cancel_ack: {e}")


@sio.on("client-asistencia")
@sio.event
async def client_asistencia(sid, data):
    """
    Evento que viene del frontend. Valida usuario y reenvía al/los sensores
    como evento 'sensor-huella'.
    
    FLUJO CORRECTO:
    1. Cliente emite 'client-asistencia' con {tipo, user_id, codigo, huella?, sensor_id?}
    2. Servidor valida y emite 'sensor-huella' DIRECTAMENTE al ESP32 (no a room)
    3. ESP32 procesa y emite 'sensor-response'
    4. Servidor emite 'client-response' al cliente
    
    data expected: {tipo, user_id, codigo, huella? , sensor_id?}
    """
    db = SessionLocal()

    print(f"\n[client-asistencia] Datos recibidos del cliente web:")
    print(f"SID del cliente: {sid}")
    try:
        print(f"Payload: {json.dumps(data, indent=2, ensure_ascii=False)}\n")
    except Exception:
        print(f"Payload (no serializable): {repr(data)}\n")
    try:
        if not isinstance(data, dict):
            await sio.emit("client-response", {
                "tipo": "error",
                "asistencia": "denied",
                "message": "Payload must be JSON object",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        tipo = data.get("tipo")
        user_id = data.get("user_id")
        codigo = data.get("codigo")
        huella = data.get("huella")  # Campo huella contiene: "<slot>|<datos_encriptados>"
        sensor_id = data.get("sensor_id")
        operation_id = data.get("operation_id")  # 🔑 ID único de operación del cliente

        # Validaciones básicas
        if not tipo or not user_id or not codigo:
            await sio.emit("client-response", {
                "tipo": tipo or "unknown",
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "denied",
                "message": "Campos 'tipo','user_id','codigo' requeridos",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        if tipo not in ["registro", "asistencia", "cancelar"]:
            await sio.emit("client-response", {
                "tipo": tipo,
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "denied",
                "message": "Tipo inválido",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        # Verificar usuario
        try:
            user = user_service.get_user(db, user_id)
        except HTTPException:
            await sio.emit("client-response", {
                "tipo": tipo,
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "denied",
                "message": f"Usuario {user_id} no encontrado",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        # Verificar código
        if getattr(user, 'codigo_user', None) != codigo:
            await sio.emit("client-response", {
                "tipo": tipo,
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "denied",
                "message": "Código no coincide",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        # ========== PARA ASISTENCIA: OBTENER HUELLA GUARDADA DE LA BD ==========
        if tipo == "asistencia":
            # Si el cliente no está enviando huella (normal), obtenerla de la BD
            if not huella:
                user_huella = getattr(user, 'huella', None)
                
                if not user_huella:
                    # Usuario no tiene huella registrada
                    await sio.emit("client-response", {
                        "tipo": tipo,
                        "user_id": user_id,
                        "codigo": codigo,
                        "asistencia": "error",
                        "message": "Usuario no tiene huella dactilar registrada",
                        "error": "no_huella_registered",
                        "timestamp": datetime.now().isoformat()
                    }, to=sid)
                    return
                
                huella = user_huella
                
                print(f"[client-asistencia] Huella obtenida de BD para verificación")
                print(f"[client-asistencia] Huella: {len(huella) if huella else 0} chars")
            
            # Validar formato de huella: debe ser "<slot>|datos"
            if '|' not in huella:
                print(f"[client-asistencia] ✗ Formato de huella inválido: {huella[:50]}")
                await sio.emit("client-response", {
                    "tipo": tipo,
                    "user_id": user_id,
                    "codigo": codigo,
                    "asistencia": "error",
                    "message": "Formato de huella inválido en BD",
                    "error": "invalid_huella_format",
                    "timestamp": datetime.now().isoformat()
                }, to=sid)
                return

        # Preparar datos para enviar al sensor
        sensor_data = {
            "tipo": tipo,
            "user_id": user_id,
            "codigo": codigo,
            "huella": huella,  # Para registro: None, para asistencia: "<slot>|datos"
            "client_sid": sid,  # SID del cliente para rastrear respuestas
            "operation_id": operation_id,  # 🔑 Propagar operation_id al ESP32
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[client-asistencia] Datos para sensor: tipo={tipo}, huella={len(huella) if huella else 0} chars, operation_id={operation_id}")

        # CANCELAR: enviar directamente sin validar sensor
        if tipo == "cancelar":
            print(f"[client-asistencia] Cancelación solicitada")
            await sio.emit("sensor-huella", sensor_data, room="sensors")
            await sio.emit("client-response", {
                "tipo": "cancelar",
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "cancelled",
                "message": "Operación cancelada",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return

        # ========== REGISTRO O ASISTENCIA: ENVIAR CON ACK Y REINTENTOS ==========
        print(f"[client-asistencia] Reenviando a sensores: {tipo} (con confirmación de recepción)")
        
        # Generar ID único para este mensaje
        message_id = str(uuid.uuid4())
        sensor_data["message_id"] = message_id
        
        # Crear evento de sincronización para esperar ACK
        ack_event = asyncio.Event()
        pending_acks[message_id] = {
            "event": ack_event,
            "received_at": datetime.now().isoformat()
        }
        
        # Enviar con reintentos
        ack_received = False
        for attempt in range(1, MAX_RETRIES + 1):
            print(f"[client-asistencia] Intento {attempt}/{MAX_RETRIES} de enviar a sensor (message_id: {message_id})")
            
            # Enviar sensor-huella
            if sensor_id:
                print(f"[client-asistencia] Sensor específico: sensor:{sensor_id}")
                await sio.emit("sensor-huella", sensor_data, room=f"sensor:{sensor_id}")
            else:
                print(f"[client-asistencia] Broadcast a todos los sensores en room 'sensors'")
                await sio.emit("sensor-huella", sensor_data, room="sensors")
            
            # Esperar ACK del sensor (máximo ACK_TIMEOUT segundos)
            try:
                await asyncio.wait_for(ack_event.wait(), timeout=ACK_TIMEOUT)
                ack_received = True
                print(f"[client-asistencia] ✓ ACK recibido del sensor en intento {attempt}")
                break
            except asyncio.TimeoutError:
                print(f"[client-asistencia] ⚠️ Timeout esperando ACK (intento {attempt}/{MAX_RETRIES})")
                if attempt < MAX_RETRIES:
                    print(f"[client-asistencia] Reintentando en 1 segundo...")
                    await asyncio.sleep(1)
                else:
                    print(f"[client-asistencia] ✗ FALLO: No se recibió ACK después de {MAX_RETRIES} intentos")
        
        # Limpiar registro de ACK pendiente
        if message_id in pending_acks:
            del pending_acks[message_id]
        
        # Si no se recibió ACK después de todos los intentos
        if not ack_received:
            await sio.emit("client-response", {
                "tipo": tipo,
                "user_id": user_id,
                "codigo": codigo,
                "asistencia": "error",
                "message": "No se pudo comunicar con el sensor. Intente nuevamente.",
                "error": "sensor_no_ack",
                "timestamp": datetime.now().isoformat()
            }, to=sid)
            return
        
        print(f"[client-asistencia] ✓ Sensor confirmó recepción, esperando respuesta de procesamiento...")

    except Exception as e:
        print(f"Error en client_asistencia: {e}")
        await sio.emit("client-response", {
            "tipo": data.get("tipo") if isinstance(data, dict) else "unknown",
            "user_id": data.get("user_id") if isinstance(data, dict) else None,
            "codigo": data.get("codigo") if isinstance(data, dict) else None,
            "asistencia": "denied",
            "message": f"Error del servidor: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }, to=sid)
    finally:
        db.close()


@sio.on("sensor-progress")
@sio.event
async def sensor_progress(sid, data):
    """
    Evento que recibe el progreso de REGISTRO en tiempo real.
    Lo reenvía directamente al cliente sin procesar.
    
    data expected: {tipo: "registro", status: "progress", step: int, message: str, client_sid: str}
    """
    try:
        if not isinstance(data, dict):
            return
        
        client_sid = data.get("client_sid")
        if not client_sid:
            return
        
        print(f"[sensor-progress] Paso {data.get('step')}: {data.get('message')}")
        
        # Reenviar directamente al cliente
        await sio.emit("client-response", data, to=client_sid)
        
    except Exception as e:
        print(f"Error en sensor_progress: {e}")


@sio.on("sensor-response")
@sio.event
async def sensor_response(sid, data):
    """
    Evento que recibe la respuesta del sensor DESPUÉS de procesar el registro/asistencia.
    
    FLUJO:
    1. ESP32 captura huella y procesa
    2. ESP32 emite 'sensor-response' con resultado
    3. Servidor valida BD (si es necesario) y emite 'client-response' al cliente
    
    data expected: {tipo, user_id, codigo, huella?, asistencia, timestamp, client_sid}
    """
    db = SessionLocal()
    try:
        print(f"\n[sensor-response] Respuesta del sensor. SID: {sid}")
        try:
            print(f"Payload: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except Exception:
            print(f"Payload (no serializable): {repr(data)}")

        # ✅ Validar estructura de datos
        if not isinstance(data, dict):
            print(f"[sensor-response] ✗ Datos inválidos: {type(data)}")
            return

        tipo = data.get("tipo")
        user_id = data.get("user_id")
        codigo = data.get("codigo")
        huella = data.get("huella")  # Contiene: "<slot>|<datos_encriptados>" para REGISTRO y ASISTENCIA
        asistencia_status = data.get("asistencia")
        client_sid = data.get("client_sid")
        operation_id = data.get("operation_id")  # 🔑 ID de operación del cliente

        # ✅ Validar campos requeridos
        if not all([tipo, user_id, codigo]):
            print(f"[sensor-response] ✗ Faltan campos requeridos: tipo={tipo}, user_id={user_id}, codigo={codigo}")
            return

        if tipo not in ["registro", "asistencia", "cancelar"]:
            print(f"[sensor-response] ✗ Tipo inválido: {tipo}")
            return

        if tipo != "cancelar":
            if not asistencia_status:
                print(f"[sensor-response] ✗ Falta asistencia_status")
                return
            if asistencia_status not in ["success", "denied", "error"]:
                print(f"[sensor-response] ✗ Estado inválido: {asistencia_status}")
                return

        # Construir respuesta para el cliente
        client_response = {
            "tipo": tipo,
            "user_id": user_id,
            "codigo": codigo,
            "huella": huella,
            "asistencia": asistencia_status,
            "operation_id": operation_id,  # 🔑 Propagar operation_id
            "timestamp": datetime.now().isoformat()
        }
        
        # 🎯 PASAR PROGRESO DE REGISTRO si existe
        if data.get("capture_progress"):
            client_response["capture_progress"] = data.get("capture_progress")
            client_response["capture_total"] = data.get("capture_total")
            client_response["capture_angle"] = data.get("capture_angle")

        # ========== CANCELACIÓN ==========
        if tipo == "cancelar":
            client_response["asistencia"] = "cancelled"
            client_response["message"] = data.get("message", "Operación cancelada")
            # Emitir al cliente específico si tenemos su SID
            if client_sid:
                print(f"[sensor-response] Cancelación enviada a cliente {client_sid}")
                await sio.emit("client-response", client_response, to=client_sid)
            else:
                # Broadcast a todos
                print(f"[sensor-response] Cancelación reenviada (broadcast)")
                await sio.emit("client-response", client_response)
            
            await sio.emit("processed", {"status": "ok", "message": "Cancelación procesada"}, to=sid)
            return

        # ========== REGISTRO - ÉXITO ==========
        if tipo == "registro" and asistencia_status == "success":
            try:
                print(f"[sensor-response] Registrando huella en BD para usuario {user_id}")
                # huella contiene formato: "<slot>|<datos_encriptados>"
                resultado = user_service.actualizar_huella(db=db, codigo_user=codigo, huella=huella)
                client_response["message"] = resultado.get("message", "Huella registrada exitosamente")
                if resultado.get("usuario"):
                    client_response["user"] = resultado.get("usuario")
                print(f"[sensor-response] ✓ Huella registrada en BD")
            except HTTPException as he:
                print(f"[sensor-response] ✗ Error al registrar huella: {he.detail}")
                client_response["message"] = he.detail
                client_response["asistencia"] = "denied"
            except Exception as e:
                print(f"[sensor-response] ✗ Error inesperado: {str(e)}")
                client_response["message"] = f"Error al registrar huella: {str(e)}"
                client_response["asistencia"] = "denied"

        # ========== ASISTENCIA - ÉXITO ==========
        elif tipo == "asistencia" and asistencia_status == "success":
            try:
                print(f"[sensor-response] Registrando asistencia para usuario {user_id}")
                resultado = asistencia_service.registrar_asistencia_huella(db=db, codigo_user=codigo)
                client_response["message"] = resultado.get("message", "Asistencia registrada exitosamente")
                if resultado.get("asistencia"):
                    client_response["data"] = resultado.get("asistencia")
                
                # Intentar agregar info del usuario
                try:
                    user = user_service.get_by_codigo(db, codigo)
                    if user:
                        client_response["user"] = {
                            "id": user.id,
                            "name": getattr(user, "name", ""),
                            "codigo": getattr(user, "codigo_user", "")
                        }
                except Exception:
                    pass
                
                print(f"[sensor-response] ✓ Asistencia registrada en BD")
            except HTTPException as he:
                print(f"[sensor-response] ✗ Error al registrar asistencia: {he.detail}")
                client_response["message"] = he.detail
                client_response["asistencia"] = "denied"
            except Exception as e:
                print(f"[sensor-response] ✗ Error inesperado: {str(e)}")
                client_response["message"] = f"Error al registrar asistencia: {str(e)}"
                client_response["asistencia"] = "denied"

        # ========== DENEGADO O ERROR ==========
        else:
            if tipo == "registro":
                client_response["message"] = data.get("error", "Error al registrar huella")
            elif tipo == "asistencia":
                client_response["message"] = data.get("error", "Acceso denegado: Huella no reconocida")
            else:
                client_response["message"] = data.get("error", "Error en el procesamiento")

        # Enviar respuesta al cliente
        print(f"[sensor-response] Emitiendo 'client-response': {json.dumps(client_response, ensure_ascii=False)}")
        if client_sid:
            print(f"[sensor-response] Enviado a cliente específico: {client_sid}")
            await sio.emit("client-response", client_response, to=client_sid)
        else:
            print(f"[sensor-response] Broadcast de respuesta")
            await sio.emit("client-response", client_response)

    except Exception as e:
        print(f"Error en sensor_response: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()  # Explícitamente rollback en caso de error
        
        # Notificar error al cliente si es posible
        try:
            error_response = {
                "tipo": data.get("tipo") if isinstance(data, dict) else "unknown",
                "user_id": data.get("user_id") if isinstance(data, dict) else None,
                "codigo": data.get("codigo") if isinstance(data, dict) else None,
                "huella": None,
                "asistencia": "denied",
                "message": f"Error del servidor: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            client_sid = data.get("client_sid") if isinstance(data, dict) else None
            if client_sid:
                await sio.emit("client-response", error_response, to=client_sid)
            else:
                await sio.emit("client-response", error_response)
        except Exception:
            pass
    finally:
        db.commit()  # ✅ COMMIT EXPLÍCITO antes de cerrar
        db.close()




# ============================================================
# CANALES SOCKET.IO CON CONFIRMACIÓN DE RECEPCIÓN:
# ============================================================
# 🔄 CLIENTE → SERVIDOR → ESP32:
#    1. Cliente emite 'client-asistencia' con (tipo, user_id, codigo, etc)
#    2. Servidor emite 'sensor-huella' con MENSAJE_ID al ESP32
#    3. ESP32 recibe y ENVÍA INMEDIATO ACK: 'sensor-ack' con MENSAJE_ID
#    4. Servidor recibe 'sensor-ack' y desbloquea espera
#    5. Si NO hay ACK en 5s: REINTENTAR (máx 3 intentos)
#    6. Si ACK OK: Esperar 'sensor-response' con resultado final
#    7. ESP32 procesa y emite 'sensor-response'
#    8. Servidor valida BD y emite 'client-response' al cliente
# ============================================================
# 📡 FLUJO DETALLADO:
#
# ✅ ÉXITO (con ACK):
#    Cliente            Servidor                ESP32
#      │                  │                       │
#      ├─ client-asistencia ──────────────────────►
#      │  (tipo, id, etc)  │                       │
#      │                  ├─ sensor-huella ──────►│ (con message_id)
#      │                  │  (message_id: uuid)  │
#      │                  │◄────── sensor-ack ───┤
#      │                  │  (message_id)         │
#      │                  │  [CAPTURANDO...]      │
#      │                  │◄── sensor-response ───┤
#      │◄─── client-response ─────────────────────┤
#      │  (success/denied)  │                       │
#
# ❌ FALLO (sin ACK):
#    Cliente            Servidor                ESP32
#      │                  │                       │
#      ├─ client-asistencia ──────────────────────►
#      │  (tipo, id, etc)  │                       │
#      │                  ├─ sensor-huella ──────►│ (Intento 1)
#      │                  │  [5s sin ACK]        │
#      │                  ├─ sensor-huella ──────►│ (Intento 2)
#      │                  │  [5s sin ACK]        │
#      │                  ├─ sensor-huella ──────►│ (Intento 3)
#      │                  │  [5s sin ACK]        │
#      │◄─ client-response ──────────────────────────┤
#      │  (error: sensor_no_ack)                  │
# ============================================================
# 🔄 CANCELACIÓN (CON O SIN ACK):
#    client-asistencia   (con tipo="cancelar")
#    │
#    └─ sensor-huella     (broadcast inmediato sin esperar ACK)
#       │
#       └─ sensor-cancel  (si ya está capturando)
# ============================================================
# 📡 ESP32 → SERVIDOR → CLIENTE:
#    sensor-progress    (progreso de REGISTRO en tiempo real)
#    sensor-response    (resultado final: success/denied/error)
#    sensor-ack        (confirmación de recepción de sensor-huella)
#    sensor-cancel-ack (confirmación de cancelación)
#         ↓
#    client-response    (servidor al cliente con resultado o progreso)