'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw } from 'lucide-react';
import type { CapturedPhoto } from '@/hooks/useRegister';

interface WebcamCaptureProps {
    onCapture: (photo: CapturedPhoto) => void;
    onRemove: (id: string) => void;
    capturedPhotos: CapturedPhoto[];
    maxPhotos?: number;
    isAvatar?: boolean;
    onAvatarCapture?: (dataUrl: string) => void;
}

export function WebcamCapture({
    onCapture,
    onRemove,
    capturedPhotos,
    maxPhotos = 10,
    isAvatar = false,
    onAvatarCapture
}: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsStreaming(true);
            }
        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsStreaming(false);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    }, [stream]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        if (isAvatar && onAvatarCapture) {
            onAvatarCapture(dataUrl);
            stopCamera();
        } else {
            const frontalCount = capturedPhotos.filter(p => p.type === 'frontal').length;
            const perfilCount = capturedPhotos.filter(p => p.type === 'perfil').length;

            // Alternar entre frontal y perfil
            const type = frontalCount <= perfilCount ? 'frontal' : 'perfil';

            const photo: CapturedPhoto = {
                id: `${Date.now()}_${Math.random()}`,
                dataUrl,
                type,
                timestamp: Date.now(),
            };

            onCapture(photo);

            if (capturedPhotos.length + 1 >= maxPhotos) {
                stopCamera();
            }
        }
    }, [capturedPhotos, maxPhotos, isAvatar, onAvatarCapture, onCapture, stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const getCurrentInstruction = () => {
        if (isAvatar) {
            return 'Toma una foto de perfil para tu avatar';
        }

        const frontalCount = capturedPhotos.filter(p => p.type === 'frontal').length;
        const perfilCount = capturedPhotos.filter(p => p.type === 'perfil').length;

        if (frontalCount <= perfilCount) {
            return `📸 Foto ${capturedPhotos.length + 1}/10: Posición FRONTAL - Mira directamente a la cámara`;
        } else {
            return `📸 Foto ${capturedPhotos.length + 1}/10: Posición DE PERFIL - Gira ligeramente tu rostro`;
        }
    };

    return (
        <div className="space-y-4">
            {!isAvatar && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Instrucciones para captura facial
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>✓ Asegúrate de tener buena iluminación frontal</li>
                        <li>✓ Tu rostro debe estar completamente visible</li>
                        <li>✓ Evita sombras en tu cara</li>
                        <li>✓ Mantén una expresión neutral</li>
                        <li>✓ Alterna entre posiciones frontales y de perfil</li>
                        <li>✓ No uses lentes oscuros ni gorras</li>
                    </ul>
                </div>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <div className="text-center">
                            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {isAvatar ? 'Cámara lista para capturar avatar' : 'Cámara lista para captura facial'}
                            </p>
                            <Button onClick={startCamera} size="lg">
                                <Camera className="w-5 h-5 mr-2" />
                                Iniciar Cámara
                            </Button>
                        </div>
                    </div>
                )}

                {isStreaming && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <p className="text-white text-center font-medium mb-3">
                            {getCurrentInstruction()}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                onClick={capturePhoto}
                                size="lg"
                                disabled={!isAvatar && capturedPhotos.length >= maxPhotos}
                                className="bg-white text-black hover:bg-gray-200"
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                Capturar Foto
                            </Button>
                            <Button
                                onClick={stopCamera}
                                size="lg"
                                variant="destructive"
                            >
                                <X className="w-5 h-5 mr-2" />
                                Detener
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {!isAvatar && capturedPhotos.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold">
                            Fotos capturadas: {capturedPhotos.length}/{maxPhotos}
                        </h4>
                        {capturedPhotos.length < maxPhotos && (
                            <Button
                                onClick={startCamera}
                                size="sm"
                                variant="outline"
                                disabled={isStreaming}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Continuar captura
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                        {capturedPhotos.map((photo) => (
                            <div key={photo.id} className="relative group">
                                <img
                                    src={photo.dataUrl}
                                    alt={`Foto ${photo.type}`}
                                    className="w-full aspect-square object-cover rounded border-2 border-gray-300"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs p-1 text-center">
                                    {photo.type === 'frontal' ? '👤 Frontal' : '↪️ Perfil'}
                                </div>
                                <button
                                    onClick={() => onRemove(photo.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {capturedPhotos.length >= maxPhotos && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                            <p className="text-green-800 dark:text-green-200 font-medium">
                                ✓ Has completado las {maxPhotos} fotos requeridas
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
