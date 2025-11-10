"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useJustificacionesApi } from "@/hooks/useJustificacionesApi.hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, ArrowLeft, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { JustificacionDetails } from "@/interfaces/justificaciones.interface";

export default function JustificacionDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getDetail } = useJustificacionesApi();

    const [justificacion, setJustificacion] = useState<JustificacionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDetail();
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        setError(null);

        const response = await getDetail(parseInt(id));
        if (response.alert === "success" && response.data) {
            setJustificacion(response.data);
        } else {
            setError(response.message || "Error al cargar la justificación");
        }

        setLoading(false);
    };

    const getEstadoColor = (estado: string) => {
        const colors: Record<string, string> = {
            pendiente: "text-yellow-600",
            aprobada: "text-green-600",
            rechazada: "text-red-600",
        };
        return colors[estado] || "text-gray-600";
    };

    const getEstadoLabel = (estado: string) => {
        type EstadoConfig = { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
        const labels: Record<string, EstadoConfig> = {
            pendiente: { text: "Pendiente de revisión", variant: "secondary" },
            aprobada: { text: "Aprobada", variant: "default" },
            rechazada: { text: "Rechazada", variant: "destructive" },
        };
        return labels[estado] || { text: estado, variant: "outline" as const };
    };

    const getTipoLabel = (tipo: string) => {
        const tiposMap: Record<string, string> = {
            medica: "Médica",
            personal: "Personal",
            familiar: "Familiar",
            academica: "Académica",
            permiso_autorizado: "Permiso Autorizado",
            vacaciones: "Vacaciones",
            licencia: "Licencia",
            otro: "Otro",
        };
        return tiposMap[tipo] || tipo;
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6 px-4 md:py-10">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !justificacion) {
        return (
            <div className="container mx-auto py-6 px-4 md:py-10 max-w-2xl">
                <Link href="/client/justificaciones">
                    <Button variant="outline" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                </Link>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error || "Justificación no encontrada"}</AlertDescription>
                </Alert>
            </div>
        );
    }

    const estadoConfig = getEstadoLabel(justificacion.estado);

    return (
        <div className="container mx-auto py-6 px-4 md:py-10 max-w-3xl">
            {/* Encabezado */}
            <div className="mb-8">
                <Link href="/client/justificaciones">
                    <Button variant="outline" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {getTipoLabel(justificacion.tipo)}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Detalles de tu solicitud de justificación
                        </p>
                    </div>
                    <Badge variant={estadoConfig.variant} className="text-base px-3 py-1">
                        {estadoConfig.text}
                    </Badge>
                </div>
            </div>

            {/* Información principal */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
                {/* Fechas */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Fechas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Desde</p>
                            <p className="font-medium">
                                {new Date(justificacion.fecha_inicio).toLocaleDateString("es-ES", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Hasta</p>
                            <p className="font-medium">
                                {new Date(justificacion.fecha_fin).toLocaleDateString("es-ES", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Información general */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Información general
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Días justificados</p>
                            <p className="font-medium text-lg">{justificacion.dias_justificados || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">ID de justificación</p>
                            <p className="font-mono text-sm">{justificacion.id}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Motivo */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Motivo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-base leading-relaxed">{justificacion.motivo}</p>
                </CardContent>
            </Card>

            {/* Documento */}
            {justificacion.documento_url && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Documento adjunto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <a
                            href={justificacion.documento_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                            <Download className="h-4 w-4" />
                            Ver documento
                        </a>
                    </CardContent>
                </Card>
            )}

            {/* Información de revisión */}
            {(justificacion.estado === "aprobada" || justificacion.estado === "rechazada") && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Información de revisión
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Revisado por</p>
                                <p className="font-medium">{justificacion.revisor_nombre || "-"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Fecha de revisión</p>
                                <p className="font-medium">
                                    {justificacion.fecha_revision
                                        ? new Date(justificacion.fecha_revision).toLocaleDateString("es-ES")
                                        : "-"}
                                </p>
                            </div>
                        </div>

                        {justificacion.comentario_revisor && (
                            <div className="pt-2 border-t border-blue-200">
                                <p className="text-xs text-muted-foreground mb-2">Comentario del revisor</p>
                                <p className="text-sm leading-relaxed">{justificacion.comentario_revisor}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Fechas de creación */}
            <Card className="bg-muted">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Creado</p>
                            <p className="font-medium">
                                {new Date(justificacion.created_at).toLocaleDateString("es-ES")}
                            </p>
                        </div>
                        {justificacion.updated_at && (
                            <div>
                                <p className="text-muted-foreground">Última actualización</p>
                                <p className="font-medium">
                                    {new Date(justificacion.updated_at).toLocaleDateString("es-ES")}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}