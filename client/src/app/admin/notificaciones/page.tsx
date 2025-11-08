"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotificacionesApi } from "@/hooks/useNotificacionesApi.hook";
import { NotificacionDetails, NotificacionesUserList } from "@/interfaces";
import { ensureArray, getErrorMessage, validatePaginatedResponse } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Trash2, Eye, EyeOff, Inbox } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const tipoBadgeVariant: Record<string, string> = {
    tardanza: "default",
    ausencia: "destructive",
    alerta: "secondary",
    justificacion: "outline",
    aprobacion: "default",
    rechazo: "destructive",
    recordatorio: "secondary",
    sistema: "outline",
    exceso_jornada: "destructive",
    incumplimiento_jornada: "destructive",
};

const prioridadBadgeVariant: Record<string, string> = {
    baja: "outline",
    media: "secondary",
    alta: "default",
    urgente: "destructive",
};

export default function NotificacionesPage() {
    const router = useRouter();
    const { listAdmin, marcarTodasLeidas, limpiar, state } = useNotificacionesApi();

    const [notificaciones, setNotificaciones] = useState<NotificacionDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [total, setTotal] = useState(0);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isLimpiando, setIsLimpiando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

    useEffect(() => {
        cargarNotificaciones();
    }, [page]);

    const cargarNotificaciones = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await listAdmin(page, pageSize);

            if (response.alert === "success" && response.data) {
                // Validar estructura de NotificacionesUserList
                const data = response.data as any;
                const notifs = ensureArray<NotificacionDetails>(data?.notificaciones);
                setNotificaciones(notifs);
                setTotal(typeof data?.total === "number" ? data.total : 0);
            } else {
                setError(response.message || "Error al cargar notificaciones");
                setNotificaciones([]);
                setTotal(0);
            }
        } catch (err) {
            const mensaje = getErrorMessage(err);
            setError(mensaje);
            setNotificaciones([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleMarcarTodasLeidas = async () => {
        try {
            const response = await marcarTodasLeidas();

            if (response.alert === "success") {
                setMensaje({ tipo: "success", texto: "Todas marcadas como leídas" });
                cargarNotificaciones();
            } else {
                setMensaje({ tipo: "error", texto: response.message || "Error al marcar como leídas" });
            }
        } catch (err) {
            setMensaje({ tipo: "error", texto: getErrorMessage(err) });
        }
    };

    const handleLimpiar = async () => {
        setIsLimpiando(true);
        try {
            const response = await limpiar();

            if (response.alert === "success") {
                setMensaje({ tipo: "success", texto: "Notificaciones eliminadas" });
                cargarNotificaciones();
                setShowDeleteDialog(false);
            } else {
                setMensaje({ tipo: "error", texto: response.message || "Error al eliminar" });
            }
        } catch (err) {
            setMensaje({ tipo: "error", texto: getErrorMessage(err) });
        } finally {
            setIsLimpiando(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notificaciones (Admin)</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona todas las notificaciones del sistema
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleMarcarTodasLeidas}
                        disabled={loading || state.loading || notificaciones.length === 0}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Marcar todas como leídas
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={loading || state.loading || notificaciones.length === 0}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpiar
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Mostradas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notificaciones.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">No Leídas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {notificaciones.filter((n) => !n.leida).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notificaciones */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Notificaciones</CardTitle>
                    <CardDescription>
                        Lista completa de todas las notificaciones del sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading || state.loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : notificaciones.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay notificaciones</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notificaciones.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 border rounded-lg transition-colors ${notif.leida ? "bg-muted/50" : "bg-background border-primary/30"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold truncate">{notif.titulo}</h4>
                                                <Badge
                                                    variant={
                                                        tipoBadgeVariant[notif.tipo] as any || "outline"
                                                    }
                                                    className="ml-auto"
                                                >
                                                    {notif.tipo}
                                                </Badge>
                                                <Badge
                                                    variant={
                                                        prioridadBadgeVariant[notif.prioridad] as any || "outline"
                                                    }
                                                >
                                                    {notif.prioridad}
                                                </Badge>
                                                <Badge variant={notif.leida ? "outline" : "secondary"}>
                                                    {notif.leida ? "Leída" : "No leída"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {notif.mensaje}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Usuario ID: {notif.user_id}</span>
                                                <span>
                                                    {new Date(notif.created_at).toLocaleString()}
                                                </span>
                                                {notif.leida && notif.fecha_lectura && (
                                                    <span>
                                                        Leída: {new Date(notif.fecha_lectura).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                router.push(`/admin/notificaciones/${notif.id}`)
                                            }
                                        >
                                            Ver
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Página {page} de {totalPages} ({total} registros)
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogTitle>Limpiar notificaciones</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro que deseas eliminar todas las notificaciones?
                        Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel disabled={isLimpiando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLimpiar}
                            disabled={isLimpiando}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLimpiando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Limpiar
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
