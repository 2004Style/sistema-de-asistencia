"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useJustificacionesApi } from "@/hooks/useJustificacionesApi.hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { JustificacionList } from "@/interfaces/justificaciones.interface";

export default function JustificacionesPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { list, state } = useJustificacionesApi();

    const [justificaciones, setJustificaciones] = useState<JustificacionList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

    useEffect(() => {
        loadJustificaciones();
    }, [page]);

    const loadJustificaciones = async () => {
        setLoading(true);
        setError(null);

        const response = await list(page, pageSize);
        if (response.alert === "success" && response.data) {
            setJustificaciones(response.data.records);
        } else {
            setError(response.message || "Error al cargar justificaciones");
        }

        setLoading(false);
    };

    const getEstadoBadge = (estado: string) => {
        const variants: Record<string, { label: string; variant: any }> = {
            pendiente: { label: "Pendiente", variant: "secondary" },
            aprobada: { label: "Aprobada", variant: "default" },
            rechazada: { label: "Rechazada", variant: "destructive" },
        };
        const config = variants[estado] || { label: estado, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getTipoBadge = (tipo: string) => {
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

    return (
        <div className="container mx-auto py-6 px-4 md:py-10">
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis Justificaciones</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona tus solicitudes de justificación de ausencia o tardanza
                    </p>
                </div>
                <Link href="/client/justificaciones/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Justificación
                    </Button>
                </Link>
            </div>

            {/* Alerta de error */}
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Estado de carga */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Lista de justificaciones */}
            {!loading && justificaciones.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">
                                No tienes justificaciones registradas
                            </p>
                            <Link href="/client/justificaciones/create">
                                <Button>Crear mi primera justificación</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {justificaciones.map((j) => (
                        <Card key={j.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <Link href={`/client/justificaciones/${j.id}`}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{getTipoBadge(j.tipo)}</CardTitle>
                                            <CardDescription className="mt-1">{j.motivo}</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            {getEstadoBadge(j.estado)}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Desde</p>
                                            <p className="font-medium">
                                                {new Date(j.fecha_inicio).toLocaleDateString("es-ES")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Hasta</p>
                                            <p className="font-medium">
                                                {new Date(j.fecha_fin).toLocaleDateString("es-ES")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Días justificados</p>
                                            <p className="font-medium">{j.dias_justificados || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Creado</p>
                                            <p className="font-medium">
                                                {new Date(j.created_at).toLocaleDateString("es-ES")}
                                            </p>
                                        </div>
                                    </div>

                                    {j.comentario_revisor && (
                                        <div className="mt-4 p-3 bg-muted rounded">
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                Comentario del revisor
                                            </p>
                                            <p className="text-sm">{j.comentario_revisor}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            )}

            {/* Paginación */}
            {!loading && justificaciones.length > 0 && (
                <div className="mt-6 flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1 || loading}
                    >
                        Anterior
                    </Button>
                    <Button variant="outline" disabled>
                        Página {page}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setPage(page + 1)}
                        disabled={justificaciones.length < pageSize || loading}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
}