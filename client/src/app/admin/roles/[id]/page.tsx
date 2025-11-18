"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRolesApi } from "@/hooks/useRolesApi.hook";
import { RolesDetails } from "@/interfaces";
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

export default function RolDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const { getDetail, delete_, state } = useRolesApi();

    const [rol, setRol] = useState<RolesDetails | null>(null);
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
            setRol(response.data as RolesDetails);
        } else {
            setError(response.message || "Error al cargar el rol");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        const response = await delete_(id);

        if (response.alert === "success") {
            setIsDeleteDialogOpen(false);
            setTimeout(() => {
                router.replace("/admin/roles");
            }, 1000);
        } else {
            setError(response.message || "Error al eliminar el rol");
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

    if (error || !rol) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error || "No se encontró el rol"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const permisos = [
        { label: "Administrador", valor: rol.es_admin },
        { label: "Puede Aprobar Justificaciones", valor: rol.puede_aprobar },
        { label: "Puede Ver Reportes", valor: rol.puede_ver_reportes },
        { label: "Puede Gestionar Usuarios", valor: rol.puede_gestionar_usuarios },
    ];

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
                        <h1 className="text-3xl font-bold tracking-tight">{rol.nombre}</h1>
                        <p className="text-muted-foreground mt-2">
                            ID: {rol.id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.replace(`/admin/roles/${rol.id}/edit`)}
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
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={rol.activo ? "default" : "destructive"}>
                            {rol.activo ? "Activo" : "Inactivo"}
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
                    <p className="text-muted-foreground">{rol.descripcion}</p>
                </CardContent>
            </Card>

            {/* Permisos */}
            <Card>
                <CardHeader>
                    <CardTitle>Permisos</CardTitle>
                    <CardDescription>
                        Permisos asignados a este rol
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {permisos.map((permiso) => (
                            <div key={permiso.label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <span className="font-medium">{permiso.label}</span>
                                <Badge variant={permiso.valor ? "default" : "outline"}>
                                    {permiso.valor ? "✓ Sí" : "✗ No"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro que deseas eliminar el rol "{rol.nombre}"?
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
