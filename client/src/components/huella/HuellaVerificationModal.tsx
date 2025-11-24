/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useRef, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useSocket } from "@/contexts/socketContext";
import { useRouter } from "next/navigation";
import "./huella.css";

export type MetodoVerificacion = "facial" | "dactilar" | "manual";

interface HuellaRequest {
    tipo: "registro" | "asistencia" | "cancelar";
    user_id: number;
    codigo: string;
    huella?: string | null;
    client_sid?: string;
}

interface HuellaResponse {
    tipo?: "registro" | "asistencia" | "cancelar" | "cancelacion_confirmada";
    user_id?: number;
    codigo?: string;
    huella?: string | null;
    asistencia?: "success" | "denied" | "error" | "cancelled";
    message?: string;
    error?: string;
    status?: "progress" | "success" | "error";
    step?: number;
    user?: {
        id: number;
        name: string;
        codigo: string;
    };
}

interface HuellaVerificationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    codigo: string;
    userId: number;
    onSuccess: (data: HuellaResponse) => void;
    onError?: (data: HuellaResponse) => void;
    onStatusChange?: (status: "esperando" | "exitoso" | "error") => void;
    showInternalSuccessModal?: boolean;
    tipo?: "registro" | "asistencia";
    huella?: string | null;
    AuthRedirect?: string;
    // Mostrar el panel de logs en tiempo real (útil solo para desarrollo)
    showDebugLogs?: boolean;
}

type EstadoVerificacion = "esperando" | "procesando" | "exitoso" | "error" | "cancelado";

export function HuellaVerificationModal({
    open,
    onOpenChange,
    codigo,
    userId,
    onSuccess,
    onError,
    onStatusChange,
    showInternalSuccessModal = false,
    tipo = "asistencia",
    huella = null,
    AuthRedirect,
    showDebugLogs = false,
}: HuellaVerificationModalProps) {
    const router = useRouter();
    const socket = useSocket();
    const [estado, setEstado] = useState<EstadoVerificacion>("esperando");
    const [mensaje, setMensaje] = useState<string>("");
    const [detalles, setDetalles] = useState<string[]>([]);
    const huellaListenerRef = useRef<((data: HuellaResponse) => void) | null>(null);
    const [mostrarModalExito, setMostrarModalExito] = useState(false);
    const [respuestaServidor, setRespuestaServidor] = useState<HuellaResponse | null>(null);

    // Para mostrar progreso en REGISTRO
    const [capturaActual, setCapturaActual] = useState<number>(0);
    const [totalCapturas, setTotalCapturas] = useState<number>(4);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_ESPERA_RESPUESTA = 35000; // 35 segundos máximo (suficiente para captura + comparación)

    // 🔑 ID único de la operación actual (para filtrar respuestas cruzadas)
    const operationIdRef = useRef<string>("");

    const actualizarDetalles = useCallback((nuevoDetalle: string) => {
        setDetalles((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${nuevoDetalle}`]);
    }, []);

    const iniciarVerificacion = useCallback(async () => {
        if (!socket) {
            setEstado("error");
            setMensaje("Error: Socket no disponible");
            return;
        }

        // 🔑 Generar ID único para esta operación
        const operationId = `${tipo}-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        operationIdRef.current = operationId;
        console.log(`[OPERATION] 🆔 Nueva operación iniciada: ${operationId}`);

        setEstado("esperando");
        setMensaje("");
        setDetalles([]);
        setCapturaActual(0);  // Reset progreso de captura
        setTotalCapturas(0);
        onStatusChange?.("esperando");
        actualizarDetalles(
            tipo === "registro"
                ? "Iniciando registro de huella dactilar..."
                : "Iniciando verificación de asistencia..."
        );

        // Informar que se está esperando confirmación del sensor
        actualizarDetalles("⏳ Esperando confirmación del sensor...");

        // Limpiar listener anterior si existe
        if (huellaListenerRef.current) {
            socket.off("client-response", huellaListenerRef.current);
        }

        // Configurar timeout para detectar si no hay respuesta
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            actualizarDetalles(`⚠️ Timeout - No se recibió respuesta del servidor`);
            setEstado("error");
            setMensaje(`✗ Timeout: No se pudo comunicar con el sensor. Intente nuevamente.`);
            onStatusChange?.("error");

        }, MAX_ESPERA_RESPUESTA);

        // Escuchar respuesta del servidor
        const handleHuellaResponse = (data: HuellaResponse) => {

            // ✅ Validar estructura de datos
            if (!data || typeof data !== "object") {
                return;
            }

            // 🔒 FILTRAR POR OPERATION_ID: Ignorar respuestas de operaciones anteriores
            const responseOperationId = (data as any).operation_id;
            if (responseOperationId && responseOperationId !== operationIdRef.current) {
                console.log(`[FILTER] ⚠️ Ignorando respuesta de operación diferente:`);
                console.log(`  Esperado: ${operationIdRef.current}`);
                console.log(`  Recibido: ${responseOperationId}`);
                actualizarDetalles(`⚠️ Respuesta de operación anterior ignorada (${responseOperationId.substring(0, 12)}...)`);
                return;
            }

            // 🔒 FILTRAR POR CLIENT_SID: Ignorar respuestas de otras sesiones
            // Si la respuesta tiene client_sid y no coincide con socket.id actual, ignorarla
            const responseClientSid = (data as any).client_sid;
            if (responseClientSid && responseClientSid !== socket?.id) {
                console.log(`[FILTER] ⚠️ Ignorando respuesta de sesión anterior: ${responseClientSid} (actual: ${socket?.id})`);
                return;
            }

            // 🎯 Manejar mensajes de PROGRESO durante REGISTRO (sin terminar la operación)
            if (data.status === "progress" && data.step !== undefined) {
                const mensaje = `📍 Paso ${data.step}: ${data.message}`;
                actualizarDetalles(mensaje);
                setCapturaActual(data.step);
                return;
            }

            // ✅ Manejar confirmación de cancelación desde ESP32
            if (data.tipo === "cancelacion_confirmada") {
                actualizarDetalles("✓ Cancelación confirmada por sensor");
                setEstado("cancelado");
                return;
            }

            // Solo resetear timeout cuando recibimos respuesta FINAL (no progreso)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            actualizarDetalles(`Respuesta del servidor recibida: ${data.asistencia}`);

            if (data.asistencia === "success") {
                setEstado("exitoso");
                setMensaje(
                    tipo === "registro"
                        ? "✓ Huella registrada exitosamente"
                        : "✓ Asistencia registrada exitosamente"
                );
                if (AuthRedirect) {
                    router.replace(AuthRedirect);
                }
                onStatusChange?.("exitoso");
                setRespuestaServidor(data);

                if (showInternalSuccessModal) {
                    setTimeout(() => {
                        setMostrarModalExito(true);
                        onOpenChange(false);
                        onSuccess(data);
                    }, 800);
                } else {
                    setTimeout(() => {
                        onSuccess(data);
                        onOpenChange(false);
                    }, 1500);
                }
            } else if (data.asistencia === "error") {
                // Cualquier error termina la operación (sin reintentos)
                setEstado("error");
                setMensaje(`✗ Error: ${data.message || data.error || "Error desconocido"}`);
                onStatusChange?.("error");
                onError?.(data);
            } else if (data.asistencia === "denied") {
                setEstado("error");
                const razon =
                    tipo === "registro"
                        ? "Error al registrar huella"
                        : "Acceso denegado: Huella no reconocida";
                setMensaje(`✗ ${data.message || razon}`);
                onStatusChange?.("error");
                onError?.(data);
            } else if (data.asistencia === "cancelled") {
                setEstado("cancelado");
                setMensaje("Operación cancelada por el usuario");
            }

            // Limpiar listener
            if (huellaListenerRef.current) {
                socket.off("client-response", huellaListenerRef.current);
            }
        };

        huellaListenerRef.current = handleHuellaResponse;
        socket.on("client-response", handleHuellaResponse);

        // Enviar solicitud al servidor
        const requestData: HuellaRequest = {
            tipo: tipo,
            user_id: userId,
            codigo: codigo,
            huella: huella,
            client_sid: socket.id,  // ✅ Incluir client_sid para tracking
        };

        // 🔑 Incluir operation_id en la solicitud
        (requestData as any).operation_id = operationId;

        actualizarDetalles(`Solicitud enviada al servidor (ID: ${operationId.substring(0, 12)}...)`);
        setEstado("procesando");
        socket.emit("client-asistencia", requestData);
    }, [socket, codigo, userId, onSuccess, onError, onStatusChange, tipo, huella, showInternalSuccessModal, actualizarDetalles, router, AuthRedirect, onOpenChange]);

    const reintentar = useCallback(() => {
        setEstado("esperando");
        setDetalles([]);
        iniciarVerificacion();
    }, [iniciarVerificacion]);

    const cancelarOperacion = useCallback(() => {
        if (socket) {
            // ✅ ENVIAR CANCELACIÓN DIRECTO AL ESP32 (no al servidor)
            const cancelRequest = {
                tipo: "cancelar",
                client_sid: socket.id,
                user_id: userId,
                codigo: codigo,
                operation_id: operationIdRef.current,  // 🔑 Incluir operation_id actual
                timestamp: new Date().toISOString(),
            };

            actualizarDetalles(`🛑 Cancelación enviada al sensor (${socket.id})`);

            // Enviar evento de cancelación al servidor (que lo reenviará al ESP32)
            socket.emit("sensor-cancel-request", cancelRequest);
        }

        setEstado("cancelado");

        // ✅ Cerrar el modal inmediatamente al cancelar
        setTimeout(() => {
            onOpenChange(false);
        }, 300);
    }, [socket, userId, codigo, actualizarDetalles, onOpenChange]);

    // Limpiar listeners y timeouts al desmontar
    useEffect(() => {
        return () => {
            if (huellaListenerRef.current && socket) {
                socket.off("client-response", huellaListenerRef.current);
                huellaListenerRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [socket]);

    // Animaciones solo para los iconos (sensor, circular-indicator)
    useEffect(() => {

        const instances: any[] = [];

        const runAnimations = async () => {
            try {
                const { animate } = await import('animejs');

                // Solo animar el icono del sensor cuando está esperando/procesando
                if ((estado === 'esperando' || estado === 'procesando') && open) {
                    instances.push(
                        animate('.huella-sensor-icon svg', {
                            scale: [0.8, 1],
                            opacity: [0.3, 1],
                            duration: 800,
                            easing: 'easeOutElastic(1, 0.6)',
                            delay: 300
                        })
                    );
                }

                // Animar el icono circular en estado exitoso
                if (estado === 'exitoso') {
                    instances.push(
                        animate('.huella-circular-indicator', {
                            opacity: [0, 1],
                            scale: [0.5, 1],
                            duration: 600,
                            easing: 'easeOutElastic(1, 0.5)',
                            delay: 200
                        })
                    );
                }

                // Animar el icono circular en estado error
                if (estado === 'error') {
                    instances.push(
                        animate('.huella-circular-indicator', {
                            opacity: [0, 1],
                            scale: [0.3, 1],
                            rotate: [15, 0],
                            duration: 600,
                            easing: 'easeOutBack',
                            delay: 200
                        })
                    );
                }

                // Animar el icono circular en estado cancelado
                if (estado === 'cancelado') {
                    instances.push(
                        animate('.huella-circular-indicator', {
                            opacity: [0, 1],
                            scale: [0.5, 1],
                            duration: 600,
                            easing: 'easeOutElastic(1, 0.5)',
                            delay: 200
                        })
                    );
                }
            } catch (err) {
                console.error('Error en animaciones:', err);
            }
        };

        runAnimations();

        return () => {
            instances.forEach(i => i?.pause?.());
        };
    }, [open, estado, capturaActual]);

    // Iniciar verificación cuando se abre el modal
    useEffect(() => {
        if (open) {
            iniciarVerificacion();
        }

        return () => {
            if (!open && huellaListenerRef.current && socket) {
                socket.off("client-response", huellaListenerRef.current);
                huellaListenerRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [open, iniciarVerificacion, socket]);

    const getTitulo = () => {
        if (tipo === "registro") {
            return "Registro de Huella Dactilar";
        }
        return "Verificación de Asistencia";
    };

    const getDescripcion = () => {
        if (tipo === "registro") {
            return "Registre su huella dactilar para futuras verificaciones";
        }
        return "Verifique su asistencia con su huella dactilar";
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(newOpen) => {
                    if (!newOpen && estado !== "exitoso" && estado !== "cancelado") {
                        cancelarOperacion();
                    }
                    onOpenChange(newOpen);
                }}
            >
                <DialogContent className="sm:max-w-xl p-6 border-0 bg-background huella-panel max-h-[90vh] overflow-y-auto">
                    <DialogHeader className=" huella-header relative z-20">
                        <DialogTitle className="text-3xl font-black text-center huella-title">
                            {getTitulo()}
                        </DialogTitle>
                        <DialogDescription className="text-center text-sm huella-description pt-2">
                            {getDescripcion()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center gap-4 px-6 relative z-20">
                        {/* ========== ESTADO: ESPERANDO / PROCESANDO ========== */}
                        {(estado === "esperando" || estado === "procesando") && (
                            <>
                                {/* Contenedor del sensor con animaciones avanzadas */}
                                <div className="huella-sensor-container">
                                    <div className="huella-sensor-ring-1" />
                                    <div className="huella-sensor-ring-2" />
                                    <div className="huella-sensor-ring-3" />

                                    {/* Líneas de escaneo */}
                                    <div className="huella-scan-lines">
                                        <div className="scan-line" />
                                        <div className="scan-line" />
                                        <div className="scan-line" />
                                        <div className="scan-line" />
                                    </div>

                                    {/* Partículas que flotan */}
                                    <div className="huella-particles">
                                        <div className="particle" />
                                        <div className="particle" />
                                        <div className="particle" />
                                    </div>

                                    {/* Icono del sensor */}
                                    <div className="huella-sensor-icon">
                                        <Fingerprint />
                                    </div>
                                </div>

                                {/* Información de progreso REGISTRO */}
                                {tipo === "registro" ? (
                                    <div className="w-full space-y-8">
                                        {/* Indicador de pasos */}
                                        <div className="huella-progress-steps">
                                            {[1, 2, 3, 4].map((paso) => (
                                                <div key={paso} className={`progress-step ${paso <= capturaActual ? 'active' : ''}`}>
                                                    <div className="progress-bar">
                                                        <div
                                                            className="progress-bar-fill"
                                                            style={{ width: paso <= capturaActual ? '100%' : '0%' }}
                                                        />
                                                    </div>
                                                    <p className="progress-label">
                                                        {paso === 1 && "Coloque"}
                                                        {paso === 2 && "Retire"}
                                                        {paso === 3 && "Vuelva"}
                                                        {paso === 4 && "Procesar"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Mensaje de estado actual */}
                                        <div className="huella-status-card">
                                            <p className="huella-status-title">
                                                {capturaActual === 0 && "⏳ Iniciando escaneo"}
                                                {capturaActual === 1 && "👆 Coloque el dedo"}
                                                {capturaActual === 2 && "✋ Retire el dedo"}
                                                {capturaActual === 3 && "👆 Coloque nuevamente"}
                                                {capturaActual >= 4 && "⚙️ Procesando"}
                                            </p>
                                            <p className="huella-status-subtitle">
                                                Paso {capturaActual} de {totalCapturas}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Información ASISTENCIA */
                                    <div className="w-full space-y-6">
                                        <div className="huella-status-card">
                                            <p className="huella-status-title">
                                                Colocando dedo...
                                            </p>
                                            <p className="huella-status-subtitle">
                                                Verificando su identidad
                                            </p>
                                            <div className="flex justify-center gap-2 pt-4">
                                                <div className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Botón Cancelar */}
                                <Button
                                    onClick={cancelarOperacion}
                                    className="huella-button-secondary w-full mt-4"
                                >
                                    ✕ Cancelar operación
                                </Button>
                            </>
                        )}

                        {/* ========== ESTADO: EXITOSO ========== */}
                        {estado === "exitoso" && (
                            <>
                                <div className="huella-circular-indicator">
                                    <div className="indicator-ring indicator-ring-1" />
                                    <div className="indicator-ring indicator-ring-2" />
                                    <CheckCircle2 className="w-20 h-20 text-green-400" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.6))' }} />
                                </div>

                                <div className="w-full text-center space-y-6">
                                    <div className="huella-status-card">
                                        <p className="huella-status-title text-green-400">
                                            {mensaje}
                                        </p>
                                        <p className="huella-status-subtitle">
                                            {tipo === "registro"
                                                ? "Su huella está registrada y lista para futuras verificaciones"
                                                : "Acceso concedido - Asistencia registrada en el sistema"}
                                        </p>
                                    </div>

                                    {respuestaServidor?.user && (
                                        <div className="huella-status-card border-green-500/30">
                                            <p className="huella-status-subtitle text-center">
                                                <span className="text-green-400 font-bold text-lg">{respuestaServidor.user.name}</span>
                                            </p>
                                            <p className="text-xs text-center text-opacity-70 text-white mt-2">
                                                {new Date().toLocaleString("es-ES", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ========== ESTADO: ERROR ========== */}
                        {estado === "error" && (
                            <>
                                <div className="huella-circular-indicator">
                                    <div className="indicator-ring indicator-ring-1" style={{ borderTopColor: 'rgba(255,0,85,0.5)', borderRightColor: 'rgba(255,0,85,0.2)' }} />
                                    <div className="indicator-ring indicator-ring-2" style={{ borderBottomColor: 'rgba(255,0,85,0.4)', borderLeftColor: 'rgba(255,0,85,0.1)' }} />
                                    <XCircle className="w-20 h-20 text-red-500" style={{ filter: 'drop-shadow(0 0 20px rgba(255,0,85,0.6))' }} />
                                </div>

                                <div className="w-full text-center space-y-6">
                                    <div className="huella-status-card border-red-500/30">
                                        <p className="huella-status-title text-red-400">
                                            ⚠️ Operación fallida
                                        </p>
                                        <p className="huella-status-subtitle text-red-300/80">
                                            {mensaje}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={reintentar}
                                        className="huella-button-primary w-full"
                                    >
                                        🔄 Reintentar verificación
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* ========== ESTADO: CANCELADO ========== */}
                        {estado === "cancelado" && (
                            <>
                                <div className="huella-circular-indicator">
                                    <div className="indicator-ring indicator-ring-1" style={{ borderTopColor: 'rgba(255,170,0,0.5)', borderRightColor: 'rgba(255,170,0,0.2)' }} />
                                    <div className="indicator-ring indicator-ring-2" style={{ borderBottomColor: 'rgba(255,170,0,0.4)', borderLeftColor: 'rgba(255,170,0,0.1)' }} />
                                    <AlertCircle className="w-20 h-20 text-yellow-500" style={{ filter: 'drop-shadow(0 0 15px rgba(255,170,0,0.5))' }} />
                                </div>

                                <div className="w-full text-center space-y-3">
                                    <div className="huella-status-card border-yellow-500/30">
                                        <p className="huella-status-title text-yellow-400">
                                            Operación cancelada
                                        </p>
                                        <p className="huella-status-subtitle text-yellow-300/80">
                                            El proceso fue detenido por el usuario
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ========== LOG PANEL (solo si showDebugLogs=true) ========== */}
                        {showDebugLogs && detalles.length > 0 && (
                            <div className="w-full mt-6 pt-6 border-t border-opacity-20 border-cyan-400">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                        Registro en tiempo real
                                    </p>
                                </div>
                                <div className="huella-log-panel">
                                    {detalles.slice(-6).map((detalle, idx) => (
                                        <div key={idx} className="log-entry">
                                            <span className="log-icon">▸</span>
                                            <span className="log-text">{detalle}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal interno de éxito opcional */}
            {showInternalSuccessModal && (
                <Dialog open={mostrarModalExito} onOpenChange={setMostrarModalExito}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl text-center text-green-600">
                                {tipo === "registro"
                                    ? "¡Huella Registrada!"
                                    : "¡Asistencia Registrada!"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="relative">
                                <CheckCircle2 className="w-24 h-24 text-green-500" />
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-20" />
                            </div>
                            {respuestaServidor?.user && (
                                <div className="text-center space-y-1">
                                    <p className="font-medium">{respuestaServidor.user.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date().toLocaleString("es-ES", {
                                            dateStyle: "short",
                                            timeStyle: "long",
                                        })}
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground text-center">
                                {tipo === "registro"
                                    ? "Su huella ha sido registrada correctamente en el sistema"
                                    : "Su asistencia ha sido registrada correctamente"}
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
