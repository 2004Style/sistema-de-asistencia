"""
WebSocket handlers for fingerprint and attendance system
Canales implementados:
- huella-register: Recibe código y tipo (registro/asistencia)
- register-huella: Recibe id_usuario y huella para actualizar en BD
- asistencia: Recibe id_usuario y acceso (success/denied) para registrar asistencia
- sensor-huella: Canal para enviar datos al sensor
- asistencia-response: Canal para respuestas de asistencia
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from src.websockets.manager import manager
from src.config.database import get_db
from src.users.service import user_service
from src.asistencias.service import asistencia_service
import json
from datetime import datetime

router = APIRouter()


@router.websocket("/ws/huella-register")
async def huella_register_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Canal: huella-register
    
    Recibe: {
        "codigo": "string",
        "tipo": "registro" | "asistencia"
    }
    
    Proceso:
    - Busca usuario por código en BD
    - Si es "registro": emite al canal "sensor-huella" con id_usuario y tipo
    - Si es "asistencia": emite al canal "sensor-huella" con id_usuario, tipo y huella
    """
    await manager.connect(websocket, "huella-register")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal huella-register",
            "channel": "huella-register"
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                codigo = message.get("codigo")
                tipo = message.get("tipo")  # "registro" o "asistencia"
                
                # Validar datos requeridos
                if not codigo or not tipo:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Campos 'codigo' y 'tipo' son requeridos"
                    }, websocket)
                    continue
                
                if tipo not in ["registro", "asistencia"]:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Tipo debe ser 'registro' o 'asistencia'"
                    }, websocket)
                    continue
                
                # Buscar usuario por código
                user = user_service.get_by_codigo(db, codigo)
                
                if not user:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Usuario con código {codigo} no encontrado"
                    }, websocket)
                    continue
                
                # Preparar respuesta según el tipo
                if tipo == "registro":
                    # Para registro, solo enviar id y tipo
                    response_data = {
                        "type": "sensor-request",
                        "id_usuario": user.id,
                        "tipo": "registro",
                        "timestamp": datetime.now().isoformat()
                    }
                elif tipo == "asistencia":
                    # Para asistencia, verificar que tenga huella registrada
                    if not user.huella:
                        await manager.send_personal_message({
                            "type": "error",
                            "message": f"Usuario {user.name} no tiene huella registrada"
                        }, websocket)
                        continue
                    
                    response_data = {
                        "type": "sensor-request",
                        "id_usuario": user.id,
                        "tipo": "asistencia",
                        "huella": user.huella,
                        "timestamp": datetime.now().isoformat()
                    }
                
                # Emitir al canal sensor-huella
                await manager.broadcast_to_channel("sensor-huella", response_data)
                
                # Confirmar al solicitante
                await manager.send_personal_message({
                    "type": "success",
                    "message": f"Solicitud de {tipo} enviada al sensor",
                    "usuario": {
                        "id": user.id,
                        "nombre": user.name,
                        "codigo": user.codigo_user
                    }
                }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "JSON inválido"
                }, websocket)
            except Exception as e:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Error: {str(e)}"
                }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "huella-register")


@router.websocket("/ws/register-huella")
async def register_huella_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Canal: register-huella
    
    Recibe: {
        "id_usuario": int,
        "huella": "string"
    }
    
    Proceso:
    - Actualiza el campo huella del usuario en BD
    - Confirma la actualización
    """
    await manager.connect(websocket, "register-huella")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal register-huella",
            "channel": "register-huella"
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                id_usuario = message.get("id_usuario")
                huella = message.get("huella")
                
                # Validar datos requeridos
                if not id_usuario or not huella:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Campos 'id_usuario' y 'huella' son requeridos"
                    }, websocket)
                    continue
                
                # Buscar usuario
                user = user_service.get(db, id_usuario)
                
                if not user:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Usuario con ID {id_usuario} no encontrado"
                    }, websocket)
                    continue
                
                # Actualizar huella (directamente en el modelo)
                user.huella = huella
                db.commit()
                db.refresh(user)
                
                # Confirmar actualización
                await manager.send_personal_message({
                    "type": "success",
                    "message": "Huella registrada exitosamente",
                    "usuario": {
                        "id": user.id,
                        "nombre": user.name,
                        "codigo": user.codigo_user
                    },
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
                # Notificar a otros canales si es necesario
                await manager.broadcast_to_channel("huella-register", {
                    "type": "huella-registered",
                    "message": f"Huella registrada para {user.name}",
                    "usuario": {
                        "id": user.id,
                        "nombre": user.name,
                        "codigo": user.codigo_user
                    }
                })
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "JSON inválido"
                }, websocket)
            except Exception as e:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Error al registrar huella: {str(e)}"
                }, websocket)
                # Rollback en caso de error
                db.rollback()
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "register-huella")


@router.websocket("/ws/asistencia")
async def asistencia_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Canal: asistencia
    
    Recibe: {
        "id_usuario": int,
        "acceso": "success" | "denied"
    }
    
    Proceso:
    - Si acceso es "success": registra asistencia en BD
    - Emite respuesta al canal "asistencia-response"
    """
    await manager.connect(websocket, "asistencia")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal asistencia",
            "channel": "asistencia"
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                id_usuario = message.get("id_usuario")
                acceso = message.get("acceso")  # "success" o "denied"
                
                # Validar datos requeridos
                if not id_usuario or not acceso:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Campos 'id_usuario' y 'acceso' son requeridos"
                    }, websocket)
                    continue
                
                if acceso not in ["success", "denied"]:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Acceso debe ser 'success' o 'denied'"
                    }, websocket)
                    continue
                
                # Buscar usuario
                user = user_service.get(db, id_usuario)
                
                if not user:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Usuario con ID {id_usuario} no encontrado"
                    }, websocket)
                    continue
                
                response_data = {
                    "id_usuario": user.id,
                    "nombre": user.name,
                    "codigo": user.codigo_user,
                    "acceso": acceso,
                    "timestamp": datetime.now().isoformat()
                }
                
                if acceso == "success":
                    # Registrar asistencia en base de datos
                    try:
                        asistencia = asistencia_service.registrar_asistencia(db, id_usuario)
                        
                        response_data.update({
                            "type": "asistencia-success",
                            "message": "Asistencia registrada exitosamente",
                            "asistencia": {
                                "id": asistencia.id,
                                "tipo_registro": asistencia.tipo_registro,
                                "hora_entrada": asistencia.hora_entrada.isoformat() if asistencia.hora_entrada else None,
                                "hora_salida": asistencia.hora_salida.isoformat() if asistencia.hora_salida else None,
                                "estado": asistencia.estado,
                                "horas_trabajadas": asistencia.horas_trabajadas
                            }
                        })
                        
                    except Exception as e:
                        response_data.update({
                            "type": "asistencia-error",
                            "message": f"Error al registrar asistencia: {str(e)}"
                        })
                else:
                    # Acceso denegado
                    response_data.update({
                        "type": "asistencia-denied",
                        "message": "Acceso denegado - Huella no reconocida"
                    })
                
                # Emitir respuesta al canal asistencia-response
                await manager.broadcast_to_channel("asistencia-response", response_data)
                
                # Confirmar al solicitante
                await manager.send_personal_message({
                    "type": "success",
                    "message": "Respuesta de asistencia enviada",
                    "data": response_data
                }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "JSON inválido"
                }, websocket)
            except Exception as e:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Error: {str(e)}"
                }, websocket)
                db.rollback()
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "asistencia")


@router.websocket("/ws/sensor-huella")
async def sensor_huella_endpoint(websocket: WebSocket):
    """
    Canal: sensor-huella
    
    Este canal es para que los sensores se conecten y escuchen
    las solicitudes de registro o validación de huella.
    """
    await manager.connect(websocket, "sensor-huella")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Sensor conectado al canal sensor-huella",
            "channel": "sensor-huella",
            "total_connections": manager.get_channel_count("sensor-huella")
        }, websocket)
        
        # Escuchar mensajes del sensor (respuestas, estados, etc.)
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Broadcast del estado del sensor a otros interesados
                await manager.broadcast_to_channel("sensor-huella", {
                    "type": "sensor-status",
                    "data": message,
                    "timestamp": datetime.now().isoformat()
                })
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "JSON inválido"
                }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "sensor-huella")
        await manager.broadcast_to_channel("sensor-huella", {
            "type": "sensor-disconnected",
            "message": "Un sensor se ha desconectado",
            "total_connections": manager.get_channel_count("sensor-huella")
        })


@router.websocket("/ws/asistencia-response")
async def asistencia_response_endpoint(websocket: WebSocket):
    """
    Canal: asistencia-response
    
    Este canal es para que los clientes se conecten y escuchen
    las respuestas de asistencia (success/denied).
    """
    await manager.connect(websocket, "asistencia-response")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal asistencia-response",
            "channel": "asistencia-response",
            "total_connections": manager.get_channel_count("asistencia-response")
        }, websocket)
        
        # Escuchar en el canal (principalmente para mantener la conexión)
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                # Este canal principalmente escucha, pero puede responder pings
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "JSON inválido"
                }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "asistencia-response")
