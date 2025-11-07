"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTurnosApi } from "@/hooks/useTurnosApi.hook";
import { TurnoDetails } from "@/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EditTurnoPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const { getDetail, update, state } = useTurnosApi();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        hora_inicio: "",
        hora_fin: "",
        activo: true,
    });

    useEffect(() => {
        cargarDetalle();
    }, [id]);

    const cargarDetalle = async () => {
        setLoading(true);
        setError(null);

        const response = await getDetail(id);

        if (response.alert === "success" && response.data) {
            const turno = response.data as TurnoDetails;
            setFormData({
                nombre: turno.nombre,
                descripcion: turno.descripcion,
                hora_inicio: turno.hora_inicio,
                hora_fin: turno.hora_fin,
                activo: turno.activo,
            });
        } else {
            setError(response.message || "Error al cargar el turno");
        }

        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckChange = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, activo: checked }));
    };

    const validateTimes = () => {
        if (!formData.hora_inicio || !formData.hora_fin) {
            setError("Las horas de inicio y fin son requeridas");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        // Validaciones
        if (!formData.nombre.trim()) {
            setError("El nombre del turno es requerido");
            setSaving(false);
            return;
        }

        if (!formData.descripcion.trim()) {
            setError("La descripción del turno es requerida");
            setSaving(false);
            return;
        }

        if (!validateTimes()) {
            setSaving(false);
            return;
        }

        const response = await update(id, formData);

        if (response.alert === "success") {
            setSuccess(true);
            setTimeout(() => {
                router.push(`/admin/turnos/${id}`);
            }, 1500);
        } else {
            setError(response.message || "Error al actualizar el turno");
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error && loading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Turno</h1>
                    <p className="text-muted-foreground mt-2">
                        ID: {id}
                    </p>
                </div>
            </div>

            {/* Success Alert */}
            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Turno actualizado exitosamente. Redirigiendo...
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del Turno</CardTitle>
                    <CardDescription>
                        Actualiza los detalles del turno
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del Turno *</Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                placeholder="Ej: Turno Matutino"
                                value={formData.nombre}
                                onChange={handleChange}
                                disabled={saving || state.loading}
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción *</Label>
                            <Textarea
                                id="descripcion"
                                name="descripcion"
                                placeholder="Describe el turno y sus características"
                                value={formData.descripcion}
                                onChange={handleChange}
                                disabled={saving || state.loading}
                                rows={4}
                            />
                        </div>

                        {/* Horarios */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Hora Inicio */}
                            <div className="space-y-2">
                                <Label htmlFor="hora_inicio">Hora de Inicio *</Label>
                                <Input
                                    id="hora_inicio"
                                    name="hora_inicio"
                                    type="time"
                                    value={formData.hora_inicio}
                                    onChange={handleChange}
                                    disabled={saving || state.loading}
                                />
                            </div>

                            {/* Hora Fin */}
                            <div className="space-y-2">
                                <Label htmlFor="hora_fin">Hora de Fin *</Label>
                                <Input
                                    id="hora_fin"
                                    name="hora_fin"
                                    type="time"
                                    value={formData.hora_fin}
                                    onChange={handleChange}
                                    disabled={saving || state.loading}
                                />
                            </div>
                        </div>

                        {/* Activo */}
                        <div className="flex items-center space-x-2 bg-muted/50 p-4 rounded-lg">
                            <Checkbox
                                id="activo"
                                checked={formData.activo}
                                onCheckedChange={handleCheckChange}
                                disabled={saving || state.loading}
                            />
                            <Label htmlFor="activo" className="cursor-pointer">
                                <div>
                                    <p className="font-medium">Turno Activo</p>
                                    <p className="text-xs text-muted-foreground">
                                        Los turnos inactivos no aparecerán en la asignación de horarios
                                    </p>
                                </div>
                            </Label>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-6">
                            <Button
                                type="submit"
                                disabled={saving || state.loading}
                            >
                                {(saving || state.loading) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Guardar Cambios
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
