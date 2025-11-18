"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTurnosApi } from "@/hooks/useTurnosApi.hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreateTurnoPage() {
    const router = useRouter();
    const { create, state } = useTurnosApi();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        hora_inicio: "",
        hora_fin: "",
        activo: true,
    });

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

        const [startHour, startMin] = formData.hora_inicio.split(":").map(Number);
        const [endHour, endMin] = formData.hora_fin.split(":").map(Number);

        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        // Permitir turnos nocturnos (que cruzan medianoche)
        if (startTime >= endTime) {
            // Esto está bien para turnos nocturnos
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validaciones
        if (!formData.nombre.trim()) {
            setError("El nombre del turno es requerido");
            setLoading(false);
            return;
        }

        if (!formData.descripcion.trim()) {
            setError("La descripción del turno es requerida");
            setLoading(false);
            return;
        }

        if (!validateTimes()) {
            setLoading(false);
            return;
        }

        const response = await create(formData);

        if (response.alert === "success") {
            setSuccess(true);
            setTimeout(() => {
                router.replace("/admin/turnos");
            }, 1500);
        } else {
            setError(response.message || "Error al crear el turno");
        }

        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Turno</h1>
                <p className="text-muted-foreground mt-2">
                    Define un nuevo turno laboral con horario específico
                </p>
            </div>

            {/* Success Alert */}
            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Turno creado exitosamente. Redirigiendo...
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
                        Completa los detalles del nuevo turno
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
                                disabled={loading}
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
                                disabled={loading}
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
                                    disabled={loading}
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
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Activo */}
                        <div className="flex items-center space-x-2 bg-muted/50 p-4 rounded-lg">
                            <Checkbox
                                id="activo"
                                checked={formData.activo}
                                onCheckedChange={handleCheckChange}
                                disabled={loading}
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
                                disabled={loading || state.loading}
                            >
                                {(loading || state.loading) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Crear Turno
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
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
