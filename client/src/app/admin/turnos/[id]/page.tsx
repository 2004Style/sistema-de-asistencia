"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTurnosApi } from "@/hooks/useTurnosApi.hook";
import { TurnoDetails } from "@/interfaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TurnoDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const { getDetail, delete_, state } = useTurnosApi();

    const [turno, setTurno] = useState<TurnoDetails | null>(null);
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
            setTurno(response.data as TurnoDetails);
        } else {
            setError(response.message || "Error al cargar el turno");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        const response = await delete_(id);

        if (response.alert === "success") {
            setIsDeleteDialogOpen(false);
            setTimeout(() => {
                router.push("/admin/turnos");
            }, 1000);
        } else {
            setError(response.message || "Error al eliminar el turno");
        }

        setIsDeleting(false);
    };

    if (loading || state.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !turno) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error || "No se encontró el turno"}
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
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{turno.nombre}</h1>
                        <p className="text-muted-foreground mt-2">
                            ID: {turno.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/admin/turnos/${turno.id}/edit`)}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={turno.activo ? "default" : "destructive"}>
                            {turno.activo ? "Activo" : "Inactivo"}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Duración</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{turno.duracion_horas}h</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tipo de Turno</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={turno.es_turno_nocturno ? "secondary" : "outline"}>
                            {turno.es_turno_nocturno ? "Nocturno" : "Diurno"}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Description */}
            <Card>
                <CardHeader>
                    <CardTitle>Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{turno.descripcion}</p>
                </CardContent>
            </Card>

            {/* Horario */}
            <Card>
                <CardHeader>
                    <CardTitle>Horario</CardTitle>
                    <CardDescription>
                        Horas de trabajo definidas para este turno
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Hora de Inicio</p>
                            <p className="text-2xl font-mono font-bold">{turno.hora_inicio}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Hora de Fin</p>
                            <p className="text-2xl font-mono font-bold">{turno.hora_fin}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>Eliminar turno</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro que deseas eliminar el turno "{turno.nombre}"?
                        Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
