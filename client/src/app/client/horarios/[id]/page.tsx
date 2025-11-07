"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";
import { HorarioDetails } from "@/interfaces";

export default function HorarioDetailPage() {
    const router = useRouter();
    const params = useParams();
    const horarioId = Number(params.id);
    const { getDetail } = useHorariosApi();

    const [horario, setHorario] = useState<HorarioDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHorario = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getDetail(horarioId);

                if (response.alert === "success" && response.data) {
                    setHorario(response.data);
                } else {
                    setError(response.message || "Error al cargar el horario");
                }
            } catch (err) {
                setError("Error al cargar el horario");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (horarioId) {
            fetchHorario();
        }
    }, [horarioId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!horario) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                </Button>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error || "No se encontró el horario"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight capitalize">
                            {horario.dia_semana} - {horario.turno_nombre}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            ID: {horario.id}
                        </p>
                    </div>
                </div>
                <Badge variant={horario.activo ? "default" : "secondary"}>
                    {horario.activo ? "Activo" : "Inactivo"}
                </Badge>
            </div>

            {/* Información general */}
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Día de la Semana
                            </p>
                            <p className="text-lg font-semibold capitalize">
                                {horario.dia_semana}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Turno
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.turno_nombre}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Horarios */}
            <Card>
                <CardHeader>
                    <CardTitle>Horarios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Hora de Entrada
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.hora_entrada || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Hora de Salida
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.hora_salida || "N/A"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tolerancias y Requerimientos */}
            <Card>
                <CardHeader>
                    <CardTitle>Tolerancias y Requerimientos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Tolerancia de Entrada (minutos)
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.tolerancia_entrada || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Tolerancia de Salida (minutos)
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.tolerancia_salida || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Horas Requeridas
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.horas_requeridas || 0}h
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Usuario */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Nombre
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.usuario_nombre || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Email
                            </p>
                            <p className="text-lg font-semibold">
                                {horario.usuario_email || "N/A"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Fechas */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de Registro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Creado el
                            </p>
                            <p className="text-sm">
                                {horario.created_at
                                    ? new Date(horario.created_at).toLocaleString("es-ES")
                                    : "N/A"}
                            </p>
                        </div>
                        {horario.updated_at && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Actualizado el
                                </p>
                                <p className="text-sm">
                                    {new Date(horario.updated_at).toLocaleString("es-ES")}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Descripción */}
            {horario.descripcion && (
                <Card>
                    <CardHeader>
                        <CardTitle>Descripción</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {horario.descripcion}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
