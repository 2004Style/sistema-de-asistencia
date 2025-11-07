"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, CheckCircle2, XCircle, Scan, ArrowLeft, RefreshCw } from "lucide-react";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "@/hooks/useClientApi.hook";

type EstadoFacial = "inicializando" | "listo" | "capturando" | "procesando" | "exitoso" | "error";

function ReconocimientoFacialContent() {
    const router = useRouter();
    const { post } = useClientApi(false);
    const searchParams = useSearchParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [estadoFacial, setEstadoFacial] = useState<EstadoFacial>("inicializando");
    const [mensaje, setMensaje] = useState("Inicializando cámara...");
    const [mostrarModalExito, setMostrarModalExito] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    const codigo = searchParams.get("codigo");
    const tipoRegistro = searchParams.get("tipo");

    useEffect(() => {
        inicializarCamara();

        return () => {
            detenerCamara();
        };
    }, []);

    const inicializarCamara = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setEstadoFacial("listo");
                setMensaje("Posicione su rostro en el centro del cuadro");
            }
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            setError("No se pudo acceder a la cámara. Verifique los permisos.");
            setEstadoFacial("error");
        }
    };

    const detenerCamara = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturarRostro = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        // Countdown antes de capturar
        setEstadoFacial("capturando");
        for (let i = 3; i > 0; i--) {
            setCountdown(i);
            setMensaje(`Capturando en ${i}...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(null);

        // Capturar imagen
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg");

            // Procesar reconocimiento facial
            await procesarReconocimientoFacial(imageData);
        }
    };

    const procesarReconocimientoFacial = async (imageData: string) => {
        setEstadoFacial("procesando");
        setMensaje("Procesando reconocimiento facial...");

        try {
            if (!codigo) {
                setEstadoFacial("error");
                setError("Código de usuario no encontrado");
                return;
            }

            // Convertir base64 a Blob
            const response = await fetch(imageData);
            const blob = await response.blob();

            // Crear FormData
            const formData = new FormData();
            formData.append("image", blob, "rostro.jpg");


            const res = await post(`${BACKEND_ROUTES.urlAsistenciaFacial}?codigo=${encodeURIComponent(codigo)}`, formData, { contentType: "form-data" });

            console.log("Respuesta del API:", res.message);
            if (res.alert === "success") {
                setEstadoFacial("exitoso");
                setMensaje("¡Rostro reconocido correctamente!");
                await registrarAsistencia();
            }
            else {
                setEstadoFacial("error");
                setMensaje(res.message || "No se pudo reconocer el rostro. Intente nuevamente.");
                setError(res.detail || res.message || "El rostro no coincide con el código proporcionado");
            }
        } catch (err) {
            console.error("Error en reconocimiento facial:", err);
            setEstadoFacial("error");
            setError("Error al procesar el reconocimiento facial. Intente nuevamente.");
        }
    };

    const registrarAsistencia = async () => {
        try {
            // La asistencia ya fue registrada por el endpoint facial
            // Solo mostramos el resultado exitoso
            detenerCamara();
            setMostrarModalExito(true);

            // Redirigir después de 3 segundos
            setTimeout(() => {
                router.push("/registro-asistencia");
            }, 3000);
        } catch (err) {
            console.error("Error al procesar asistencia:", err);
            setError("Error al procesar la asistencia");
        }
    };

    const reintentar = () => {
        setEstadoFacial("listo");
        setMensaje("Posicione su rostro en el centro del cuadro");
        setError(null);
    };

    const volver = () => {
        detenerCamara();
        router.push("/registro-asistencia");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="container mx-auto max-w-4xl">
                <Button
                    onClick={volver}
                    variant="ghost"
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>

                <Card className="shadow-2xl">
                    <CardHeader className="text-center space-y-2">
                        <CardDescription className="text-base">
                            {mensaje}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Vista previa de la cámara */}
                        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />

                            {/* Overlay con guía facial */}
                            {(estadoFacial === "listo" || estadoFacial === "capturando") && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-64 h-80 border-4 border-purple-500 rounded-full opacity-50">
                                        {/* Puntos de referencia */}
                                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-purple-500 rounded-full -translate-x-1/2" />
                                        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-purple-500 rounded-full -translate-x-1/2" />
                                        <div className="absolute top-1/2 left-0 w-2 h-2 bg-purple-500 rounded-full -translate-y-1/2" />
                                        <div className="absolute top-1/2 right-0 w-2 h-2 bg-purple-500 rounded-full -translate-y-1/2" />
                                    </div>
                                </div>
                            )}

                            {/* Countdown overlay */}
                            {countdown !== null && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                    <div className="text-white text-9xl font-bold animate-pulse">
                                        {countdown}
                                    </div>
                                </div>
                            )}

                            {/* Estado de procesamiento */}
                            {estadoFacial === "procesando" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
                                        <p className="text-white text-xl">Procesando...</p>
                                    </div>
                                </div>
                            )}

                            {/* Estado de éxito */}
                            {estadoFacial === "exitoso" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-70">
                                    <div className="text-center">
                                        <CheckCircle2 className="w-24 h-24 text-white mx-auto mb-4" />
                                        <p className="text-white text-2xl font-semibold">¡Reconocido!</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Canvas oculto para captura */}
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Mensajes de error */}
                        {error && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-4">
                            {estadoFacial === "listo" && (
                                <Button
                                    onClick={capturarRostro}
                                    className="flex-1 text-lg py-6"
                                    size="lg"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    Capturar Rostro
                                </Button>
                            )}

                            {estadoFacial === "error" && (
                                <Button
                                    onClick={reintentar}
                                    className="flex-1 text-lg py-6"
                                    size="lg"
                                    variant="outline"
                                >
                                    <RefreshCw className="w-5 h-5 mr-2" />
                                    Reintentar
                                </Button>
                            )}
                        </div>

                        {/* Información adicional */}
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Consejos para un mejor reconocimiento:
                            </h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• Asegúrese de tener buena iluminación</li>
                                <li>• Posicione su rostro en el centro del cuadro</li>
                                <li>• Mantenga una expresión neutral</li>
                                <li>• Retire gafas o accesorios si es posible</li>
                                <li>• Evite movimientos bruscos</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de éxito */}
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
                        <p className="text-center text-lg font-medium">
                            Su asistencia de <strong>{tipoRegistro}</strong> ha sido registrada exitosamente
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                            Método: Reconocimiento Facial
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                            {new Date().toLocaleString("es-ES", {
                                dateStyle: "full",
                                timeStyle: "short"
                            })}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ReconocimientoFacialPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900" />
            </div>
        }>
            <ReconocimientoFacialContent />
        </Suspense>
    );
}
