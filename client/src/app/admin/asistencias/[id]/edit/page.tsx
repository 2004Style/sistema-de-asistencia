"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAsistenciasApi } from "@/hooks/useAsistenciasApi.hook";
import { AsistenciaDetails } from "@/interfaces/asistencias.interface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, Loader, Save } from "lucide-react";

type StatusType = "presente" | "ausente" | "tarde" | "justificado" | "permiso";

export default function AsistenciaEditPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const { getDetail, update, state } = useAsistenciasApi();

    const [asistencia, setAsistencia] = useState<AsistenciaDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Formulario
    const [formData, setFormData] = useState({
        hora_entrada: "",
        hora_salida: "",
        estado: "" as StatusType | "",
        observaciones: "",
    });

    useEffect(() => {
        cargarDetalle();
    }, [id]);

    const cargarDetalle = async () => {
        setLoading(true);
        setError(null);

        const response = await getDetail(id);

        if (response.alert === "success" && response.data) {
            setAsistencia(response.data);
            setFormData({
                hora_entrada: response.data.hora_entrada || "",
                hora_salida: response.data.hora_salida || "",
                estado: response.data.estado as StatusType,
                observaciones: response.data.observaciones || "",
            });
        } else {
            setError(response.message || "Error al cargar la asistencia");
        }

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        // Validaciones
        if (!formData.hora_entrada) {
            setError("La hora de entrada es requerida");
            setSaving(false);
            return;
        }

        if (!formData.hora_salida) {
            setError("La hora de salida es requerida");
            setSaving(false);
            return;
        }

        if (!formData.estado) {
            setError("El estado es requerido");
            setSaving(false);
            return;
        }

        const response = await update(id, formData);

        if (response.alert === "success") {
            router.replace(`/admin/asistencias/${id}`);
        } else {
            setError(response.message || "Error al actualizar la asistencia");
        }

        setSaving(false);
    };

    if (loading || state.loading) {
        return (
            <div className="w-full p-4 md:p-6 flex items-center justify-center h-screen">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error && !asistencia) {
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
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!asistencia) {
        return null;
    }

    return (
        <div className="w-full space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
            {/* Botón volver */}
            <div>
                <Button onClick={() => router.back()} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>

            {/* Encabezado */}
            <div>
                <h1 className="text-3xl font-bold">Editar Asistencia</h1>
                <p className="text-muted-foreground">
                    Modifica los detalles del registro de asistencia
                </p>
            </div>

            {/* Error alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Alert del estado */}
            {state.alert === "error" && state.error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}

            {/* Información del registro */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-lg">Información del Registro</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="text-base font-medium">
                            {new Date(asistencia.fecha).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Usuario</p>
                        <p className="text-base font-medium">{asistencia.nombre_usuario}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Código</p>
                        <p className="text-base font-mono">{asistencia.codigo_usuario}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Detalles de Edición</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Horarios */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="hora_entrada" className="mb-2 block">
                                    Hora de Entrada <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="hora_entrada"
                                    type="time"
                                    value={formData.hora_entrada}
                                    onChange={(e) =>
                                        setFormData({ ...formData, hora_entrada: e.target.value })
                                    }
                                    required
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <Label htmlFor="hora_salida" className="mb-2 block">
                                    Hora de Salida <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="hora_salida"
                                    type="time"
                                    value={formData.hora_salida}
                                    onChange={(e) =>
                                        setFormData({ ...formData, hora_salida: e.target.value })
                                    }
                                    required
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        {/* Estado */}
                        <div>
                            <Label htmlFor="estado" className="mb-2 block">
                                Estado <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.estado}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, estado: value as StatusType })
                                }
                            >
                                <SelectTrigger id="estado">
                                    <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="presente">Presente</SelectItem>
                                    <SelectItem value="ausente">Ausente</SelectItem>
                                    <SelectItem value="tarde">Tarde</SelectItem>
                                    <SelectItem value="justificado">Justificado</SelectItem>
                                    <SelectItem value="permiso">Permiso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Observaciones */}
                        <div>
                            <Label htmlFor="observaciones" className="mb-2 block">
                                Observaciones
                            </Label>
                            <Textarea
                                id="observaciones"
                                placeholder="Agrega notas sobre esta asistencia..."
                                value={formData.observaciones}
                                onChange={(e) =>
                                    setFormData({ ...formData, observaciones: e.target.value })
                                }
                                rows={5}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
