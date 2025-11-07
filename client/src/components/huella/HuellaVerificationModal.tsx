import { useEffect, useRef, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useSocket } from "@/contexts/socketContext";

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
}: HuellaVerificationModalProps) {
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

    const actualizarDetalles = useCallback((nuevoDetalle: string) => {
        setDetalles((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${nuevoDetalle}`]);
    }, []);

    const iniciarVerificacion = useCallback(async () => {
        if (!socket) {
            console.error("[HuellaVerificationModal] Socket no disponible");
            setEstado("error");
            setMensaje("Error: Socket no disponible");
            return;
        }

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

        // Limpiar listener anterior si existe
        if (huellaListenerRef.current) {
            socket.off("client-response", huellaListenerRef.current);
        }

        // Configurar timeout para detectar si no hay respuesta
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            console.warn(`[HuellaVerificationModal] Timeout sin respuesta del servidor (${MAX_ESPERA_RESPUESTA}ms)`);
            actualizarDetalles(`⚠️ Timeout - No se recibió respuesta del servidor`);
            setEstado("error");
            setMensaje(`✗ Timeout: No se pudo comunicar con el sensor. Intente nuevamente.`);
            onStatusChange?.("error");

        }, MAX_ESPERA_RESPUESTA);

        // Escuchar respuesta del servidor#00d9ff
        const handleHuellaResponse = (data: HuellaResponse) => {
            console.log("[HuellaVerificationModal] Respuesta del servidor:", data);

            // ✅ Validar estructura de datos
            if (!data || typeof data !== "object") {
                console.error("[HuellaVerificationModal] Datos inválidos recibidos:", data);
                return;
            }

            // 🎯 Manejar mensajes de PROGRESO durante REGISTRO (sin terminar la operación)
            if (data.status === "progress" && data.step !== undefined) {
                const mensaje = `📍 Paso ${data.step}: ${data.message}`;
                console.log("[HuellaVerificationModal] Progreso:", mensaje);
                actualizarDetalles(mensaje);
                setCapturaActual(data.step);
                return;
            }

            // ✅ Manejar confirmación de cancelación desde ESP32
            if (data.tipo === "cancelacion_confirmada") {
                console.log("[HuellaVerificationModal] ✓ Cancelación confirmada por ESP32");
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

        console.log(
            `[HuellaVerificationModal] Enviando solicitud de ${tipo}:`,
            requestData
        );
        actualizarDetalles(`Solicitud enviada al servidor`);
        setEstado("procesando");
        socket.emit("client-asistencia", requestData);
    }, [socket, codigo, userId, onSuccess, onError, onStatusChange, tipo, huella, showInternalSuccessModal, actualizarDetalles]);

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
                timestamp: new Date().toISOString(),
            };

            console.log("[HuellaVerificationModal] ⏹️ CANCELACIÓN INMEDIATA");
            console.log(`  Socket ID: ${socket.id}`);
            console.log(`  Evento: sensor-cancel-request`);
            console.log(`  Payload:`, cancelRequest);
            actualizarDetalles(`🛑 Cancelación enviada al sensor (${socket.id})`);

            // Enviar evento de cancelación al servidor (que lo reenviará al ESP32)
            socket.emit("sensor-cancel-request", cancelRequest);
        } else {
            console.error("[HuellaVerificationModal] Socket no disponible para cancelación");
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
                <DialogContent className="sm:max-w-lg bg-gradient-to-b from-slate-50 to-white border-0 shadow-2xl">
                    <DialogHeader className="space-y-1 pb-2">
                        <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                            {getTitulo()}
                        </DialogTitle>
                        <DialogDescription className="text-center text-base text-slate-600 pt-2">
                            {getDescripcion()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-12 space-y-8 px-4">
                        {/* ========== ESTADO: ESPERANDO / PROCESANDO ========== */}
                        {(estado === "esperando" || estado === "procesando") && (
                            <>
                                {/* Animación principal del sensor */}
                                <div className="relative w-40 h-40">
                                    {/* Círculo exterior animado */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse opacity-30" />

                                    {/* Icono del sensor */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
                                            <Fingerprint className="w-24 h-24 text-blue-600 relative z-10 animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Líneas de escaneo animadas */}
                                    <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '0.2s' }} />
                                    <div className="absolute bottom-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" style={{ animationDelay: '0.4s' }} />
                                </div>

                                {/* Información de progreso REGISTRO */}
                                {tipo === "registro" ? (
                                    <div className="w-full space-y-6">
                                        {/* Indicador de pasos */}
                                        <div className="flex justify-between items-center gap-2">
                                            {[1, 2, 3, 4].map((paso) => (
                                                <div key={paso} className="flex-1">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-300 ${paso <= capturaActual
                                                            ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                                            : "bg-slate-200"
                                                            }`}
                                                    />
                                                    <p className="text-xs text-center text-slate-600 mt-1">
                                                        {paso === 1 && "Coloque"}
                                                        {paso === 2 && "Retire"}
                                                        {paso === 3 && "Vuelva"}
                                                        {paso === 4 && "Procesar"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Mensaje de estado actual */}
                                        <div className="text-center space-y-2 bg-blue-50 rounded-lg p-4 border border-blue-100">
                                            <p className="text-lg font-semibold text-blue-700">
                                                {capturaActual === 0 && "⏳ Iniciando escaneo..."}
                                                {capturaActual === 1 && "👆 Coloque el dedo"}
                                                {capturaActual === 2 && "✋ Retire el dedo"}
                                                {capturaActual === 3 && "👆 Coloque nuevamente"}
                                                {capturaActual >= 4 && "⚙️ Procesando..."}
                                            </p>
                                            <p className="text-sm text-blue-600">
                                                Paso {capturaActual} de {totalCapturas}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Información ASISTENCIA */
                                    <div className="w-full text-center space-y-3 bg-blue-50 rounded-lg p-6 border border-blue-100">
                                        <p className="text-xl font-semibold text-blue-700">
                                            Colocando dedo...
                                        </p>
                                        <p className="text-sm text-blue-600">
                                            Verificando su identidad
                                        </p>
                                        <div className="flex justify-center gap-1 pt-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                )}                                {/* Botón Cancelar */}
                                <Button
                                    onClick={cancelarOperacion}
                                    variant="outline"
                                    className="w-full text-slate-600 hover:bg-red-50 hover:text-red-600 border-slate-300 hover:border-red-300"
                                >
                                    ✕ Cancelar
                                </Button>
                            </>
                        )}

                        {/* ========== ESTADO: EXITOSO ========== */}
                        {estado === "exitoso" && (
                            <>
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-60 animate-pulse" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <CheckCircle2 className="w-28 h-28 text-green-500 animate-bounce" />
                                    </div>
                                </div>

                                <div className="w-full text-center space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-green-600">{mensaje}</p>
                                        <p className="text-sm text-slate-600">
                                            {tipo === "registro"
                                                ? "Su huella está lista para futuras verificaciones"
                                                : "Acceso concedido - Asistencia registrada"}
                                        </p>
                                    </div>

                                    {respuestaServidor?.user && (
                                        <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-1">
                                            <p className="text-sm font-semibold text-slate-700">
                                                {respuestaServidor.user.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
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
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-60 animate-pulse" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <XCircle className="w-28 h-28 text-red-500 animate-bounce" />
                                    </div>
                                </div>

                                <div className="w-full text-center space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-2xl font-bold text-red-600">Operación fallida</p>
                                        <p className="text-sm text-slate-600 bg-red-50 rounded-lg p-3 border border-red-200">
                                            {mensaje}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={reintentar}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold"
                                    >
                                        🔄 Reintentar
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* ========== ESTADO: CANCELADO ========== */}
                        {estado === "cancelado" && (
                            <>
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-60 animate-pulse" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <AlertCircle className="w-28 h-28 text-yellow-500" />
                                    </div>
                                </div>

                                <div className="w-full text-center space-y-2">
                                    <p className="text-2xl font-bold text-yellow-700">Cancelado</p>
                                    <p className="text-sm text-slate-600">
                                        El proceso fue cancelado por el usuario
                                    </p>
                                </div>
                            </>
                        )}

                        {/* ========== DETALLES DEL PROCESO ========== */}
                        {detalles.length > 0 && (
                            <div className="w-full mt-4 border-t pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Registro de proceso
                                    </p>
                                </div>
                                <div className="bg-slate-800 text-slate-100 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs space-y-1 border border-slate-700">
                                    {detalles.slice(-5).map((detalle, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <span className="text-green-400 flex-shrink-0">✓</span>
                                            <span className="text-slate-400">{detalle}</span>
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
