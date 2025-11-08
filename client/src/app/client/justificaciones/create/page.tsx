"use client";

import { useState } from "react";
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
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export default function CreateJustificacionPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { create } = useJustificacionesApi();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        tipo: "",
        fecha_inicio: "",
        fecha_fin: "",
        motivo: "",
        documento_url: "",
    });

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
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validaciones
        if (!session?.user) {
            setError("Debe estar autenticado");
            setLoading(false);
            return;
        }

        if (
            !formData.tipo ||
            !formData.fecha_inicio ||
            !formData.fecha_fin ||
            !formData.motivo
        ) {
            setError("Por favor completa todos los campos obligatorios");
            setLoading(false);
            return;
        }

        if (formData.motivo.length < 10) {
            setError("El motivo debe tener al menos 10 caracteres");
            setLoading(false);
            return;
        }

        if (new Date(formData.fecha_inicio) > new Date(formData.fecha_fin)) {
            setError("La fecha de inicio no puede ser mayor que la fecha de fin");
            setLoading(false);
            return;
        }

        try {
            const response = await create({
                user_id: session.user.id || 0,
                tipo: formData.tipo as "medica" | "personal" | "familiar" | "academica" | "permiso_autorizado" | "vacaciones" | "licencia" | "otro",
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin,
                motivo: formData.motivo,
                documento_url: formData.documento_url,
            });

            if (response.alert === "success") {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/client/justificaciones");
                }, 2000);
            } else {
                setError(response.message || "Error al crear justificación");
            }
        } catch (err: unknown) {
            const error = err as Record<string, unknown>;
            setError((error.message as string) || "Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-6 px-4 md:py-10 max-w-2xl">
            {/* Encabezado */}
            <div className="mb-8">
                <Link href="/client/justificaciones" className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Volver a justificaciones
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Nueva Justificación</h1>
                <p className="text-muted-foreground mt-2">
                    Completa el formulario para solicitar una justificación
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
                        ¡Justificación creada exitosamente! Serás redirigido...
                    </AlertDescription>
                </Alert>
            )}

            {/* Formulario */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de la justificación</CardTitle>
                    <CardDescription>
                        Proporciona los detalles de tu solicitud de justificación
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
                                Motivo de la justificación * (mínimo 10 caracteres)
                            </Label>
                            <Textarea
                                id="motivo"
                                name="motivo"
                                value={formData.motivo}
                                onChange={handleChange}
                                placeholder="Describe el motivo de tu justificación..."
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
                            <p className="text-xs text-muted-foreground mt-2">
                                Adjunta la URL de un certificado u otro documento que respalde tu justificación
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4 pt-4">
                            <Link href="/client/justificaciones" className="flex-1">
                                <Button variant="outline" className="w-full" disabled={loading}>
                                    Cancelar
                                </Button>
                            </Link>
                            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? "Guardando..." : "Enviar solicitud"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Nota informativa */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <p className="text-sm text-blue-900">
                        <span className="font-semibold">Nota:</span> Tu justificación será revisada
                        por el administrador. Recibirás una notificación cuando sea aprobada o rechazada.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}