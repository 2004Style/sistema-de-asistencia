"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAsistenciasApi } from "@/hooks/useAsistenciasApi.hook";
import { AsistenciaDetails } from "@/interfaces/asistencias.interface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertTriangle,
    ArrowLeft,
    Loader,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    Edit,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function AsistenciaDetailAdminPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const { getDetail, delete_, state } = useAsistenciasApi();

    const [asistencia, setAsistencia] = useState<AsistenciaDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        cargarDetalle();
    }, [id]);

    const cargarDetalle = async () => {
        setLoading(true);
        setError(null);

        const response = await getDetail(id);

        if (response.alert === "success" && response.data) {
            setAsistencia(response.data);
        } else {
            setError(response.message || "Error al cargar la asistencia");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        const response = await delete_(id);

        if (response.alert === "success") {
            setIsDeleteDialogOpen(false);
            router.replace("/admin/asistencias");
        } else {
            setError(response.message || "Error al eliminar la asistencia");
            setIsDeleting(false);
        }
    };

    const getEstadoBadge = (estado: string) => {
        const variants: Record<
            string,
            { label: string; icon: React.ReactNode; color: string }
        > = {
            presente: {
                label: "Presente",
                icon: <CheckCircle className="w-4 h-4" />,
                color: "bg-green-500",
            },
            ausente: {
                label: "Ausente",
                icon: <XCircle className="w-4 h-4" />,
                color: "bg-red-500",
            },
            tarde: {
                label: "Tarde",
                icon: <Clock className="w-4 h-4" />,
                color: "bg-yellow-500",
            },
            justificado: {
                label: "Justificado",
                icon: <FileText className="w-4 h-4" />,
                color: "bg-blue-500",
            },
            permiso: {
                label: "Permiso",
                icon: <AlertCircle className="w-4 h-4" />,
                color: "bg-purple-500",
            },
        };

        const variant = variants[estado] || variants.ausente;

        return (
            <div className="flex items-center gap-2">
                <Badge className={`${variant.color} text-white`}>
                    <span className="inline mr-1">{variant.icon}</span>
                    {variant.label}
                </Badge>
            </div>
        );
    };

    if (loading || state.loading) {
        return (
            <div className="w-full p-4 md:p-6 flex items-center justify-center h-screen">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !asistencia) {
        return (
            <div className="w-full space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-2">
                    <Button onClick={() => router.back()} variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                </div>

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error || "No se pudo cargar la asistencia"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 p-4 md:p-6">
            {/* Botón volver */}
            <div>
                <Button onClick={() => router.back()} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>

            {/* Encabezado con acciones */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Detalle de Asistencia</h1>
                    <p className="text-muted-foreground">
                        Información completa del registro ID #{id}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Link href={`/admin/asistencias/${id}/edit`}>
                        <Button className="gap-2">
                            <Edit className="w-4 h-4" />
                            Editar
                        </Button>
                    </Link>
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Error alert */}
            {state.alert === "error" && state.error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}

            {/* Cards de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card: Fecha y Estado */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Fecha</p>
                            <p className="text-base font-medium">
                                {new Date(asistencia.fecha).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "long",
                                })}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Estado</p>
                            {getEstadoBadge(asistencia.estado)}
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">ID Horario</p>
                            <p className="text-base font-mono">{asistencia.horario_id}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card: Horarios */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Horarios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Hora de Entrada</p>
                            <p className="text-base font-medium">
                                {asistencia.hora_entrada || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Hora de Salida</p>
                            <p className="text-base font-medium">
                                {asistencia.hora_salida || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Horas Trabajadas</p>
                            <p className="text-base font-medium">
                                {asistencia.horas_trabajadas_formato || "—"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card: Tardanza */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Tardanza</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Minutos de Tardanza
                            </p>
                            <p className="text-lg font-semibold">
                                {asistencia.minutos_tardanza > 0 ? (
                                    <span className="text-yellow-600">
                                        {asistencia.minutos_tardanza} min
                                    </span>
                                ) : (
                                    <span className="text-green-600">Sin tardanza</span>
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Minutos Trabajados
                            </p>
                            <p className="text-base font-medium">
                                {asistencia.minutos_trabajados} min
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">¿Tardanza?</p>
                            <p className="text-base">
                                {asistencia.tardanza ? (
                                    <Badge className="bg-red-500">Sí</Badge>
                                ) : (
                                    <Badge variant="outline">No</Badge>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card: Métodos de Registro */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Métodos de Registro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Entrada
                            </p>
                            <p className="text-base font-medium">
                                <Badge variant="outline">
                                    {asistencia.metodo_entrada?.toUpperCase() || "—"}
                                </Badge>
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Salida
                            </p>
                            <p className="text-base font-medium">
                                {asistencia.metodo_salida ? (
                                    <Badge variant="outline">
                                        {asistencia.metodo_salida.toUpperCase()}
                                    </Badge>
                                ) : (
                                    <span>—</span>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card: Información del Usuario */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Información del Usuario</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Usuario</p>
                            <p className="text-base font-medium">
                                {asistencia.nombre_usuario || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Código</p>
                            <p className="text-base font-mono">
                                {asistencia.codigo_usuario || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Email</p>
                            <p className="text-base font-medium text-blue-600">
                                {asistencia.email_usuario || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">ID Usuario</p>
                            <p className="text-base font-mono">{asistencia.user_id}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card: Información Adicional */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Información Adicional</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                ID Justificación
                            </p>
                            <p className="text-base">
                                {asistencia.justificacion_id ? (
                                    <Link
                                        href={`/admin/justificaciones/${asistencia.justificacion_id}`}
                                        className="text-blue-600 font-mono hover:underline"
                                    >
                                        #{asistencia.justificacion_id}
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Card: Observaciones */}
            {asistencia.observaciones && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base whitespace-pre-wrap">{asistencia.observaciones}</p>
                    </CardContent>
                </Card>
            )}

            {/* Card: Timestamps */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm">Información del Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>
                        Creado: {new Date(asistencia.created_at).toLocaleString("es-ES")}
                    </p>
                    {asistencia.updated_at && (
                        <p>
                            Actualizado: {new Date(asistencia.updated_at).toLocaleString("es-ES")}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                title="¿Eliminar asistencia?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de asistencia."
                itemName={`Asistencia de ${asistencia.nombre_usuario || asistencia.user_id}`}
                isLoading={isDeleting}
            />
        </div>
    );
}
