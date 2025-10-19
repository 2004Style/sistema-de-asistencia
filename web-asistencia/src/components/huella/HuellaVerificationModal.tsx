import { useEffect, useRef, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, CheckCircle2, XCircle } from "lucide-react";
import { useSocket } from "@/contexts/socketContext";

interface HuellaRequest {
    tipo: "registro" | "asistencia";
    user_id: number;
    codigo: string;
    huella: string | null;
}

interface HuellaResponse {
    tipo: "registro" | "asistencia";
    user_id: number;
    codigo: string;
    huella: string | null;
    asistencia: "success" | "denied";
}

interface HuellaVerificationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    codigo: string;
    userId: number;
    onSuccess: (data: HuellaResponse) => void;
    onError?: (data: HuellaResponse) => void;
    onStatusChange?: (status: "esperando" | "exitoso" | "error") => void;
    // Si true, el propio componente mostrará un modal de éxito después de verificar la huella.
    // Por defecto es false para mantener comportamiento existente (el padre puede mostrar su propio modal).
    showInternalSuccessModal?: boolean;
    // Tipo de verificación: "registro" o "asistencia" (por defecto "asistencia")
    tipo?: "registro" | "asistencia";
    // Huella dactilar (por defecto null)
    huella?: string | null;
}

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
    const [estado, setEstado] = useState<"esperando" | "exitoso" | "error">("esperando");
    const huellaListenerRef = useRef<((data: HuellaResponse) => void) | null>(null);
    const [mostrarModalExito, setMostrarModalExito] = useState(false);

    const iniciarVerificacion = useCallback(async () => {
        if (!socket) {
            console.error("Socket no disponible");
            return;
        }

        setEstado("esperando");
        onStatusChange?.("esperando");

        // Limpiar listener anterior si existe
        if (huellaListenerRef.current) {
            socket.off("client-response", huellaListenerRef.current);
        }

        // Escuchar respuesta del servidor
        const handleHuellaResponse = (data: HuellaResponse) => {
            if (data.asistencia === "success") {
                setEstado("exitoso");
                onStatusChange?.("exitoso");
                if (showInternalSuccessModal) {
                    // Mostrar modal interno de éxito y cerrar el diálogo de verificación
                    setTimeout(() => {
                        setMostrarModalExito(true);
                        // cerramos el modal de verificación para evitar solapamiento
                        onOpenChange(false);
                        // notificar al padre
                        onSuccess(data);
                    }, 300);
                } else {
                    // Comportamiento por defecto: notificar y cerrar con pequeño retardo
                    setTimeout(() => {
                        onSuccess(data);
                        onOpenChange(false);
                    }, 1000);
                }
            } else {
                setEstado("error");
                onStatusChange?.("error");
                onError?.(data);
            }

            // Limpiar listener
            if (huellaListenerRef.current) {
                socket.off("client-response", huellaListenerRef.current);
            }
        };

        huellaListenerRef.current = handleHuellaResponse;
        socket.on("client-response", handleHuellaResponse);

        // Enviar datos de verificación al servidor
        const requestData: HuellaRequest = {
            tipo: tipo,
            user_id: userId,
            codigo: codigo,
            huella: huella,
        };

        socket.emit("client-asistencia", requestData);
    }, [socket, codigo, userId, onSuccess, onError, onStatusChange, tipo, huella, showInternalSuccessModal]);

    const reintentar = useCallback(() => {
        setEstado("esperando");
        iniciarVerificacion();
    }, [iniciarVerificacion]);

    // Limpiar listeners al desmontar
    useEffect(() => {
        return () => {
            if (huellaListenerRef.current && socket) {
                socket.off("client-response", huellaListenerRef.current);
                huellaListenerRef.current = null;
            }
        };
    }, [socket]);

    // Iniciar verificación cuando se abre el modal
    useEffect(() => {
        if (open) {
            setEstado("esperando");
            iniciarVerificacion();
        }

        // Resetear cuando se cierra el modal
        return () => {
            if (!open && huellaListenerRef.current && socket) {
                socket.off("client-response", huellaListenerRef.current);
                huellaListenerRef.current = null;
            }
        };
    }, [open, iniciarVerificacion, socket]);

    return (
        <Dialog
            open={open}
            onOpenChange={(newOpen) => {
                onOpenChange(newOpen);
                if (!newOpen && huellaListenerRef.current && socket) {
                    socket.off("client-response", huellaListenerRef.current);
                    huellaListenerRef.current = null;
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center">Verificación Dactilar</DialogTitle>
                    <DialogDescription className="sr-only">
                        Proceso de verificación mediante huella dactilar para registro de asistencia
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    {estado === "esperando" && (
                        <>
                            <div className="relative">
                                <Fingerprint className="w-32 h-32 text-blue-500 animate-pulse" />
                                <div className="absolute inset-0 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
                            </div>
                            <p className="text-center text-lg">
                                Por favor, coloque su dedo en el sensor
                            </p>
                        </>
                    )}

                    {estado === "exitoso" && (
                        <>
                            <CheckCircle2 className="w-32 h-32 text-green-500" />
                            <p className="text-center text-lg text-green-600 font-semibold">
                                ¡Huella verificada correctamente!
                            </p>
                        </>
                    )}

                    {estado === "error" && (
                        <>
                            <XCircle className="w-32 h-32 text-red-500" />
                            <p className="text-center text-lg text-red-600 font-semibold">
                                No se pudo verificar la huella
                            </p>
                            <Button onClick={reintentar} variant="outline">
                                Reintentar
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
            {/* Modal interno de éxito opcional - no se muestra por defecto */}
            {showInternalSuccessModal && (
                <Dialog open={mostrarModalExito} onOpenChange={setMostrarModalExito}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl text-center text-green-600">
                                ¡Asistencia Registrada!
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="relative">
                                <CheckCircle2 className="w-24 h-24 text-green-500" />
                                <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-20" />
                            </div>
                            <p className="text-center text-sm text-muted-foreground">
                                {new Date().toLocaleString("es-ES", {
                                    dateStyle: "full",
                                    timeStyle: "short",
                                })}
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
