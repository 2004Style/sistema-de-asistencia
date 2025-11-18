"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";
import { useSession } from "next-auth/react";
import { CrearHorario } from "@/interfaces";
import { useClientApi } from "@/hooks/useClientApi.hook";

type DiaSemanaType = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

const DIAS_SEMANA: { value: DiaSemanaType; label: string }[] = [
    { value: "lunes", label: "Lunes" },
    { value: "martes", label: "Martes" },
    { value: "miercoles", label: "Miércoles" },
    { value: "jueves", label: "Jueves" },
    { value: "viernes", label: "Viernes" },
    { value: "sabado", label: "Sábado" },
    { value: "domingo", label: "Domingo" },
];

interface TurnosList {
    id: number;
    nombre: string;
    hora_inicio: string;
    hora_fin: string;
    descripcion?: string;
}

export function ClientHorarioCreate({ id_user }: { id_user?: number }) {

    const router = useRouter();
    const { data: session } = useSession();
    const { create } = useHorariosApi(id_user ? false : true);
    const { GET } = useClientApi(id_user ? false : true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [turnos, setTurnos] = useState<TurnosList[]>([]);
    const [turnosLoading, setTurnosLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        dia_semana: "" as DiaSemanaType | "",
        turno_id: "",
        hora_entrada: "",
        hora_salida: "",
        activo: true,
        descripcion: "",
    });

    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});

    // Cargar turnos al iniciar
    useEffect(() => {
        const fetchTurnos = async () => {
            try {
                setTurnosLoading(true);
                const response = await GET<{ records: TurnosList[] }>("/turnos");

                if (response.alert === "success" && response.data) {
                    setTurnos(response.data.records || []);
                }
            } catch (err) {
            } finally {
                setTurnosLoading(false);
            }
        };

        fetchTurnos();
    }, [GET]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.dia_semana) {
            errors.dia_semana = "Día de la semana es requerido";
        }

        if (!formData.turno_id) {
            errors.turno_id = "Turno es requerido";
        }

        if (!formData.hora_entrada.match(/^\d{2}:\d{2}$/)) {
            errors.hora_entrada = "Formato HH:MM requerido";
        }

        if (!formData.hora_salida.match(/^\d{2}:\d{2}$/)) {
            errors.hora_salida = "Formato HH:MM requerido";
        }

        // Validar que la hora de entrada no sea menor a la hora de inicio del turno
        if (formData.turno_id && formData.hora_entrada) {
            const turnoSeleccionado = turnos.find(t => String(t.id) === formData.turno_id);
            if (turnoSeleccionado) {
                if (formData.hora_entrada < turnoSeleccionado.hora_inicio) {
                    errors.hora_entrada = `La hora de entrada no puede ser antes de ${turnoSeleccionado.hora_inicio} (inicio del turno)`;
                }
            }
        }

        // Validar que la hora de salida no sea mayor a la hora de fin del turno
        if (formData.turno_id && formData.hora_salida) {
            const turnoSeleccionado = turnos.find(t => String(t.id) === formData.turno_id);
            if (turnoSeleccionado) {
                if (formData.hora_salida > turnoSeleccionado.hora_fin) {
                    errors.hora_salida = `La hora de salida no puede ser después de ${turnoSeleccionado.hora_fin} (fin del turno)`;
                }
            }
        }

        // Validar que la hora de entrada sea menor a la hora de salida
        if (formData.hora_entrada && formData.hora_salida) {
            if (formData.hora_entrada >= formData.hora_salida) {
                errors.hora_salida = "La hora de salida debe ser mayor a la hora de entrada";
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!session?.user?.id && !id_user) {
            setError("No se pudo obtener tu información de usuario");
            return;
        }

        const userId = session?.user.id ?? id_user;

        if (userId === undefined) {
            setError("No se pudo obtener tu información de usuario");
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);

            // Calcular horas requeridas considerando minutos
            const [horaEntrada, minEntrada] = formData.hora_entrada.split(":").map(Number);
            const [horaSalida, minSalida] = formData.hora_salida.split(":").map(Number);
            const minutosTotales = (horaSalida * 60 + minSalida) - (horaEntrada * 60 + minEntrada);
            const horasRequeridas = Math.round(minutosTotales / 60);

            const createData: CrearHorario = {
                user_id: userId,
                dia_semana: formData.dia_semana as DiaSemanaType,
                turno_id: parseInt(formData.turno_id),
                hora_entrada: formData.hora_entrada,
                hora_salida: formData.hora_salida,
                horas_requeridas: horasRequeridas,
                tolerancia_entrada: 15,
                tolerancia_salida: 15,
                activo: formData.activo,
                descripcion: formData.descripcion || undefined,
            };

            const response = await create(createData);

            if (response.alert === "success") {
                setSuccessMessage("¡Horario creado exitosamente!");
                setTimeout(() => {
                    router.replace("/client/horarios");
                }, 1500);
            } else {
                setError(response.message || "Error al crear el horario");
            }
        } catch {
            setError("Error al crear el horario");
        } finally {
            setSaving(false);
        }
    };

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
                    <h1 className="text-3xl font-bold tracking-tight">
                        Crear Mi Horario
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Solicita un nuevo horario de trabajo
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
                    <CardTitle>Información de tu Horario</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Día de la Semana */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Día de la Semana *
                                </label>
                                <Select
                                    value={formData.dia_semana}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            dia_semana: value as DiaSemanaType,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un día" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DIAS_SEMANA.map((dia) => (
                                            <SelectItem key={dia.value} value={dia.value}>
                                                {dia.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {validationErrors.dia_semana && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.dia_semana}
                                    </p>
                                )}
                            </div>

                            {/* Turno */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Turno *</label>
                                {turnosLoading ? (
                                    <div className="flex items-center justify-center h-10">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.turno_id}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                turno_id: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un turno" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {turnos.map((turno) => (
                                                <SelectItem key={turno.id} value={String(turno.id)}>
                                                    {`${turno.nombre} (${turno.hora_inicio} - ${turno.hora_fin})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {validationErrors.turno_id && (
                                    <p className="text-sm text-red-500">
                                        {validationErrors.turno_id}
                                    </p>
                                )}
                                {formData.turno_id && turnos.find(t => String(t.id) === formData.turno_id) && (
                                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                        📋 Rango permitido: {turnos.find(t => String(t.id) === formData.turno_id)?.hora_inicio} a {turnos.find(t => String(t.id) === formData.turno_id)?.hora_fin}
                                    </p>
                                )}
                            </div>

                            {/* Hora de Entrada */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Hora de Entrada *
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
                                    Hora de Salida *
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
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Descripción (opcional)
                            </label>
                            <Input
                                placeholder="Notas sobre tu solicitud de horario..."
                                value={formData.descripcion}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        descripcion: e.target.value,
                                    })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Información adicional que quieras incluir
                            </p>
                        </div>

                        {/* Estado Activo */}
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">
                                    Activar inmediatamente
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Marca si deseas que el horario esté activo desde ahora
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
                                {saving ? "Creando..." : "Crear Horario"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
