"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useJustificacionesApi } from "@/hooks/useJustificacionesApi.hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { JustificacionDetails } from "@/interfaces/justificaciones.interface";

const TIPOS_JUSTIFICACION = [
    { value: "medica", label: "Médica" },
    { value: "personal", label: "Personal" },
    { value: "familiar", label: "Familiar" },
    { value: "academica", label: "Académica" },
    { value: "permiso_autorizado", label: "Permiso Autorizado" },
    { value: "vacaciones", label: "Vacaciones" },
    { value: "licencia", label: "Licencia" },
    { value: "otro", label: "Otro" },
];

export default function EditJustificacionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { getDetail, update } = useJustificacionesApi();

    const [justificacion, setJustificacion] = useState<JustificacionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        tipo: "",
        fecha_inicio: "",
        fecha_fin: "",
        motivo: "",
        documento_url: "",
    });

    useEffect(() => {
        loadDetail();
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        setError(null);

        const response = await getDetail(parseInt(id));
        if (response.alert === "success" && response.data) {
            const j = response.data;
            setJustificacion(j);
            setFormData({
                tipo: j.tipo,
                fecha_inicio: j.fecha_inicio.split("T")[0],
                fecha_fin: j.fecha_fin.split("T")[0],
                motivo: j.motivo,
                documento_url: j.documento_url || "",
            });
        } else {
            setError(response.message || "Error al cargar la justificación");
        }

        setLoading(false);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData((prev) => ({ ...prev, tipo: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        if (!formData.tipo || !formData.fecha_inicio || !formData.fecha_fin || !formData.motivo) {
            setError("Por favor completa todos los campos obligatorios");
            setSaving(false);
            return;
        }

        if (formData.motivo.length < 10) {
            setError("El motivo debe tener al menos 10 caracteres");
            setSaving(false);
            return;
        }

        if (new Date(formData.fecha_inicio) > new Date(formData.fecha_fin)) {
            setError("La fecha de inicio no puede ser mayor que la fecha de fin");
            setSaving(false);
            return;
        }

        try {
            const response = await update(parseInt(id), {
                tipo: formData.tipo as "medica" | "personal" | "familiar" | "academica" | "permiso_autorizado" | "vacaciones" | "licencia" | "otro",
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin,
                motivo: formData.motivo,
                documento_url: formData.documento_url,
            });

            if (response.alert === "success") {
                setSuccess(true);
                setTimeout(() => {
                    router.push(`/admin/justificaciones/${id}`);
                }, 1500);
            } else {
                setError(response.message || "Error al actualizar");
            }
        } catch (err: unknown) {
            const error = err as Record<string, unknown>;
            setError((error.message as string) || "Error inesperado");
        } finally {
            setSaving(false);
        }
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

    if (!justificacion) {
        return (
            <div className="container mx-auto py-6 px-4 md:py-10 max-w-2xl">
                <Link href="/admin/justificaciones">
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

    // Solo se puede editar si está pendiente
    if (justificacion.estado !== "pendiente") {
        return (
            <div className="container mx-auto py-6 px-4 md:py-10 max-w-2xl">
                <Link href={`/admin/justificaciones/${id}`}>
                    <Button variant="outline" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                </Link>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No se puede editar una justificación que no está en estado pendiente.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 md:py-10 max-w-2xl">
            {/* Encabezado */}
            <div className="mb-8">
                <Link href={`/admin/justificaciones/${id}`}>
                    <Button variant="outline" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Editar justificación</h1>
                <p className="text-muted-foreground mt-2">
                    Actualiza los detalles de la solicitud
                </p>
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        ¡Justificación actualizada correctamente! Redirigiendo...
                    </AlertDescription>
                </Alert>
            )}

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de la justificación</CardTitle>
                    <CardDescription>
                        Modifica los detalles de la solicitud
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tipo de justificación */}
                        <div>
                            <Label htmlFor="tipo" className="text-base font-semibold">
                                Tipo de justificación *
                            </Label>
                            <Select value={formData.tipo} onValueChange={handleSelectChange}>
                                <SelectTrigger id="tipo" className="mt-2">
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPOS_JUSTIFICACION.map((tipo) => (
                                        <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fecha inicio */}
                        <div>
                            <Label htmlFor="fecha_inicio" className="text-base font-semibold">
                                Fecha de inicio *
                            </Label>
                            <Input
                                id="fecha_inicio"
                                type="date"
                                name="fecha_inicio"
                                value={formData.fecha_inicio}
                                onChange={handleChange}
                                className="mt-2"
                            />
                        </div>

                        {/* Fecha fin */}
                        <div>
                            <Label htmlFor="fecha_fin" className="text-base font-semibold">
                                Fecha de fin *
                            </Label>
                            <Input
                                id="fecha_fin"
                                type="date"
                                name="fecha_fin"
                                value={formData.fecha_fin}
                                onChange={handleChange}
                                className="mt-2"
                            />
                        </div>

                        {/* Motivo */}
                        <div>
                            <Label htmlFor="motivo" className="text-base font-semibold">
                                Motivo * (mínimo 10 caracteres)
                            </Label>
                            <Textarea
                                id="motivo"
                                name="motivo"
                                value={formData.motivo}
                                onChange={handleChange}
                                className="mt-2 min-h-[120px]"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                {formData.motivo.length}/10 caracteres mínimo
                            </p>
                        </div>

                        {/* Documento URL */}
                        <div>
                            <Label htmlFor="documento_url" className="text-base font-semibold">
                                URL del documento (opcional)
                            </Label>
                            <Input
                                id="documento_url"
                                type="url"
                                name="documento_url"
                                value={formData.documento_url}
                                onChange={handleChange}
                                placeholder="https://ejemplo.com/documento.pdf"
                                className="mt-2"
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4 pt-4">
                            <Link href={`/admin/justificaciones/${id}`} className="flex-1">
                                <Button variant="outline" className="w-full" disabled={saving}>
                                    Cancelar
                                </Button>
                            </Link>
                            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
