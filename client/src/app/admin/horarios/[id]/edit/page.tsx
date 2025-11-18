"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";
import { HorarioDetails, ActualizarHorario } from "@/interfaces";

export default function AdminHorarioEditPage() {
    const router = useRouter();
    const params = useParams();
    const horarioId = Number(params.id);
    const { getDetail, update } = useHorariosApi();

    const [horario, setHorario] = useState<HorarioDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        hora_entrada: "",
        hora_salida: "",
        horas_requeridas: 0,
        tolerancia_entrada: 0,
        tolerancia_salida: 0,
        activo: true,
    });

    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});

    // Cargar el horario existente
    useEffect(() => {
        const fetchHorario = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getDetail(horarioId);

                if (response.alert === "success" && response.data) {
                    setHorario(response.data);
                    // Rellenar el formulario con los datos existentes
                    setFormData({
                        hora_entrada: response.data.hora_entrada || "",
                        hora_salida: response.data.hora_salida || "",
                        horas_requeridas: response.data.horas_requeridas || 0,
                        tolerancia_entrada: response.data.tolerancia_entrada || 0,
                        tolerancia_salida: response.data.tolerancia_salida || 0,
                        activo: response.data.activo || true,
                    });
                } else {
                    setError(response.message || "Error al cargar el horario");
                }
            } catch {
                setError("Error al cargar el horario");
            } finally {
                setLoading(false);
            }
        };

        if (horarioId) {
            fetchHorario();
        }
    }, [horarioId]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.hora_entrada.match(/^\d{2}:\d{2}$/)) {
            errors.hora_entrada = "Formato HH:MM requerido";
        }

        if (!formData.hora_salida.match(/^\d{2}:\d{2}$/)) {
            errors.hora_salida = "Formato HH:MM requerido";
        }

        if (formData.horas_requeridas < 0) {
            errors.horas_requeridas = "Debe ser mayor a 0";
        }

        if (formData.tolerancia_entrada < 0) {
            errors.tolerancia_entrada = "Debe ser mayor o igual a 0";
        }

        if (formData.tolerancia_salida < 0) {
            errors.tolerancia_salida = "Debe ser mayor o igual a 0";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);

            const updateData: Partial<ActualizarHorario> = {
                hora_entrada: formData.hora_entrada,
                hora_salida: formData.hora_salida,
                horas_requeridas: formData.horas_requeridas,
                tolerancia_entrada: formData.tolerancia_entrada,
                tolerancia_salida: formData.tolerancia_salida,
                activo: formData.activo,
            };

            const response = await update(horarioId, updateData);

            if (response.alert === "success") {
                setSuccessMessage("Horario actualizado exitosamente");
                setTimeout(() => {
                    router.replace(`/admin/horarios/${horarioId}`);
                }, 1000);
            } else {
                setError(response.message || "Error al actualizar el horario");
            }
        } catch {
            setError("Error al actualizar el horario");
        } finally {
            setSaving(false);
        }
    };

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
                        Editar: {horario.dia_semana} - {horario.turno_nombre}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        ID: {horario.id}
                    </p>
                </div>
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {successMessage && (
                <Alert variant="default" className="border-green-600 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        {successMessage}
                    </AlertDescription>
                </Alert>
            )}

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Editar Horario</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Hora de Entrada */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Hora de Entrada
                                </label>
                                <Input
                                    type="time"
                                    value={formData.hora_entrada}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            hora_entrada: e.target.value,
                                        })
                                    }
                                />
                                {validationErrors.hora_entrada && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.hora_entrada}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Formato: HH:MM (ej: 08:00)
                                </p>
                            </div>

                            {/* Hora de Salida */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Hora de Salida
                                </label>
                                <Input
                                    type="time"
                                    value={formData.hora_salida}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            hora_salida: e.target.value,
                                        })
                                    }
                                />
                                {validationErrors.hora_salida && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.hora_salida}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Formato: HH:MM (ej: 17:00)
                                </p>
                            </div>

                            {/* Horas Requeridas */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Horas Requeridas
                                </label>
                                <Input
                                    type="number"
                                    step={0.5}
                                    value={formData.horas_requeridas}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            horas_requeridas: parseFloat(e.target.value),
                                        })
                                    }
                                />
                                {validationErrors.horas_requeridas && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.horas_requeridas}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Número de horas que se deben trabajar
                                </p>
                            </div>

                            {/* Tolerancia de Entrada */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Tolerancia de Entrada (minutos)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.tolerancia_entrada}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            tolerancia_entrada: parseInt(e.target.value),
                                        })
                                    }
                                />
                                {validationErrors.tolerancia_entrada && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.tolerancia_entrada}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Minutos de tolerancia para llegar
                                </p>
                            </div>

                            {/* Tolerancia de Salida */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Tolerancia de Salida (minutos)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.tolerancia_salida}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            tolerancia_salida: parseInt(e.target.value),
                                        })
                                    }
                                />
                                {validationErrors.tolerancia_salida && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.tolerancia_salida}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Minutos de tolerancia para salir
                                </p>
                            </div>
                        </div>

                        {/* Estado Activo */}
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">
                                    Horario Activo
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Determina si este horario está en vigencia
                                </p>
                            </div>
                            <Checkbox
                                checked={formData.activo}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        activo: Boolean(checked),
                                    })
                                }
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {saving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
