"""
WebSocket handlers for fingerprint sensor system
Sistema completo de comunicación entre Cliente -> Servidor -> Sensor

Canales implementados:
1. client-asistencia: Cliente envía datos al servidor
2. sensor-huella: Servidor envía datos al sensor
3. sensor-response: Sensor envía respuesta al servidor
4. client-response: Servidor envía respuesta al cliente
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from src.websockets.manager import manager
from src.config.database import get_db
from src.users.model import User
from src.users.service import UserService
from src.asistencias.model import Asistencia, EstadoAsistencia, MetodoRegistro
from src.horarios.model import Horario
import json
from datetime import datetime, date, time
from typing import Optional

router = APIRouter()


@router.websocket("/ws/client-asistencia")
async def client_asistencia_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Canal: client-asistencia
    
    Cliente envía datos al servidor para validar asistencia o registrar huella
    
    Recibe del cliente:
    {
        "tipo": "registro" | "asistencia",
        "user_id": int,
        "codigo": string,
        "huella": string | null
    }
    
    Reenvía al sensor (canal sensor-huella):
    {
        "tipo": "registro" | "asistencia",
        "user_id": int,
        "codigo": string,
        "huella": string | null
    }
    """
    await manager.connect(websocket, "client-asistencia")
    user_service = UserService(db)
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal client-asistencia",
            "channel": "client-asistencia",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                tipo = message.get("tipo")
                user_id = message.get("user_id")
                codigo = message.get("codigo")
                huella = message.get("huella")
                
                # Validar datos requeridos
                if not tipo or not user_id or not codigo:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Campos 'tipo', 'user_id' y 'codigo' son requeridos",
                        "channel": "client-asistencia"
                    }, websocket)
                    continue
                
                if tipo not in ["registro", "asistencia"]:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Tipo debe ser 'registro' o 'asistencia'",
                        "channel": "client-asistencia"
                    }, websocket)
                    continue
                
                # Verificar que el usuario existe
                user = user_service.get_user(user_id)
                if not user:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Usuario con ID {user_id} no encontrado",
                        "channel": "client-asistencia"
                    }, websocket)
                    continue
                
                # Verificar que el código coincida
                if user.codigo_user != codigo:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "El código no coincide con el usuario",
                        "channel": "client-asistencia"
                    }, websocket)
                    continue
                
                # Reenviar al sensor
                sensor_data = {
                    "tipo": tipo,
                    "user_id": user_id,
                    "codigo": codigo,
                    "huella": huella,
                    "timestamp": datetime.now().isoformat()
                }
                
                await manager.broadcast(
                    json.dumps(sensor_data),
                    "sensor-huella"
                )
                
                # Confirmar al cliente que se envió al sensor
                await manager.send_personal_message({
                    "type": "forwarded",
                    "message": "Datos enviados al sensor",
                    "channel": "client-asistencia",
                    "data": sensor_data
                }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Formato JSON inválido"
                }, websocket)
            except Exception as e:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Error procesando mensaje: {str(e)}"
                }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "client-asistencia")
        print("Cliente desconectado del canal client-asistencia")


@router.websocket("/ws/sensor-huella")
async def sensor_huella_endpoint(websocket: WebSocket):
    """
    Canal: sensor-huella
    
    El sensor recibe datos del servidor para validar huella
    
    Recibe del servidor:
    {
        "tipo": "registro" | "asistencia",
        "user_id": int,
        "codigo": string,
        "huella": string | null
    }
    
    El sensor debe validar la huella y responder en el canal sensor-response
    """
    await manager.connect(websocket, "sensor-huella")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Sensor conectado al canal sensor-huella",
            "channel": "sensor-huella",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            # El sensor solo escucha, no envía datos por este canal
            data = await websocket.receive_text()
            
            # Si el sensor envía algo por este canal, es un error
            await manager.send_personal_message({
                "type": "error",
                "message": "Este canal es solo para recibir. Usa sensor-response para responder",
                "channel": "sensor-huella"
            }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "sensor-huella")
        print("Sensor desconectado del canal sensor-huella")


@router.websocket("/ws/sensor-response")
async def sensor_response_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Canal: sensor-response
    
    El sensor envía la respuesta después de validar la huella
    
    Recibe del sensor:
    {
        "tipo": "registro" | "asistencia",
        "user_id": int,
        "codigo": string,
        "huella": string | null,
        "asistencia": "success" | "denied"
    }
    
    Proceso:
    - Si tipo="registro" y asistencia="success": Actualiza huella en BD
    - Si tipo="asistencia" y asistencia="success": Registra asistencia en BD
    - Reenvía respuesta al cliente (canal client-response)
    """
    await manager.connect(websocket, "sensor-response")
    user_service = UserService(db)
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal sensor-response",
            "channel": "sensor-response",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                tipo = message.get("tipo")
                user_id = message.get("user_id")
                codigo = message.get("codigo")
                huella = message.get("huella")
                asistencia_status = message.get("asistencia")
                
                # Validar datos requeridos
                if not all([tipo, user_id, codigo, asistencia_status]):
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Todos los campos son requeridos",
                        "channel": "sensor-response"
                    }, websocket)
                    continue
                
                if tipo not in ["registro", "asistencia"]:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Tipo debe ser 'registro' o 'asistencia'",
                        "channel": "sensor-response"
                    }, websocket)
                    continue
                
                if asistencia_status not in ["success", "denied"]:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "asistencia debe ser 'success' o 'denied'",
                        "channel": "sensor-response"
                    }, websocket)
                    continue
                
                # Preparar respuesta para el cliente
                client_response = {
                    "tipo": tipo,
                    "user_id": user_id,
                    "codigo": codigo,
                    "huella": huella,
                    "asistencia": asistencia_status,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Procesar según el resultado
                if asistencia_status == "success":
                    if tipo == "registro":
                        # Actualizar huella en la base de datos
                        try:
                            resultado = user_service.actualizar_huella(
                                db=db,
                                codigo_user=codigo,
                                huella=huella
                            )
                            
                            client_response["message"] = resultado.get("message", "Huella registrada")
                            client_response["user"] = resultado.get("usuario")
                            
                        except HTTPException as he:
                            client_response["message"] = he.detail
                            client_response["asistencia"] = "denied"
                        except Exception as e:
                            client_response["message"] = f"Error al registrar huella: {str(e)}"
                            client_response["asistencia"] = "denied"
                    
                    elif tipo == "asistencia":
                        # Registrar asistencia en la base de datos
                        user = user_service.get_user(user_id)
                        if not user:
                            client_response["message"] = "Error: Usuario no encontrado"
                            client_response["asistencia"] = "denied"
                        else:
                            try:
                                # Usar el nuevo método simplificado de asistencia
                                from src.asistencias.service import asistencia_service
                                
                                resultado = asistencia_service.registrar_asistencia_huella(
                                    db=db,
                                    codigo_user=codigo
                                )
                                
                                client_response["message"] = resultado.get("message", "Asistencia registrada")
                                client_response["data"] = resultado.get("asistencia")
                                client_response["user"] = {
                                    "id": user.id,
                                    "name": user.name,
                                    "codigo": user.codigo_user
                                }
                                
                            except HTTPException as he:
                                client_response["message"] = he.detail
                                client_response["asistencia"] = "denied"
                            except Exception as e:
                                client_response["message"] = f"Error al registrar asistencia: {str(e)}"
                                client_response["asistencia"] = "denied"
                
                else:  # denied
                    if tipo == "registro":
                        client_response["message"] = "Error al registrar huella"
                    elif tipo == "asistencia":
                        client_response["message"] = "Acceso denegado: Huella no reconocida"
                
                # Reenviar respuesta al cliente
                await manager.broadcast(
                    json.dumps(client_response),
                    "client-response"
                )
                
                # Confirmar al sensor que se procesó
                await manager.send_personal_message({
                    "type": "processed",
                    "message": "Respuesta procesada y enviada al cliente",
                    "channel": "sensor-response"
                }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Formato JSON inválido"
                }, websocket)
            except Exception as e:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Error procesando mensaje: {str(e)}"
                }, websocket)
                
                # Notificar al cliente del error
                error_response = {
                    "tipo": tipo if 'tipo' in locals() else "unknown",
                    "user_id": user_id if 'user_id' in locals() else None,
                    "codigo": codigo if 'codigo' in locals() else None,
                    "huella": None,
                    "asistencia": "denied",
                    "message": f"Error del servidor: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }
                await manager.broadcast(
                    json.dumps(error_response),
                    "client-response"
                )
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "sensor-response")
        print("Sensor desconectado del canal sensor-response")


@router.websocket("/ws/client-response")
async def client_response_endpoint(websocket: WebSocket):
    """
    Canal: client-response
    
    El cliente recibe la respuesta final del proceso
    
    Recibe del servidor:
    {
        "tipo": "registro" | "asistencia",
        "user_id": int,
        "codigo": string,
        "huella": string | null,
        "asistencia": "success" | "denied",
        "message": string,
        "timestamp": string,
        ... otros campos según el caso
    }
    """
    await manager.connect(websocket, "client-response")
    
    try:
        await manager.send_personal_message({
            "type": "connection",
            "message": "Conectado al canal client-response",
            "channel": "client-response",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            # El cliente solo escucha, no envía datos por este canal
            data = await websocket.receive_text()
            
            # Si el cliente envía algo por este canal, es un error
            await manager.send_personal_message({
                "type": "error",
                "message": "Este canal es solo para recibir respuestas",
                "channel": "client-response"
            }, websocket)
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, "client-response")
        print("Cliente desconectado del canal client-response")
