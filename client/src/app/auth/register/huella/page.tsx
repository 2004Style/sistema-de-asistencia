"use client"

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocket } from "@/contexts/socketContext"
import { CheckCircle2, Fingerprint, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export interface RegistrarHuella {
    id_usuario: number;
    codigo: string;
    tipo: "register" | "asistencia";
}

export default function RegisterHuellaPage() {
    const socket = useSocket();
    const [respuesta, setrespuesta] = useState<"esperando" | "success" | "error">("esperando");

    const registrarHuella: RegistrarHuella = {
        id_usuario: 1,
        codigo: "123456",
        tipo: "register"
    }

    useEffect(() => {
        if (!socket) return;

        socket.emit("huella-register", registrarHuella);
        socket.on("respuesta", (data) => {
            console.log(data);
            setrespuesta(data);
        });

    }, [socket]);

    const reintentar = () => {

    }
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="p-8">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Registrar Dactilar</CardTitle>
                </CardHeader>
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    {respuesta === "esperando" && (
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

                    {respuesta === "success" && (
                        <>
                            <CheckCircle2 className="w-32 h-32 text-green-500" />
                            <p className="text-center text-lg text-green-600 font-semibold">
                                ¡Huella verificada correctamente!
                            </p>
                        </>
                    )}

                    {respuesta === "error" && (
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
            </Card>
        </div>
    )
}