/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Trash2, Plus, AlertCircle } from "lucide-react";
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
    const { createBulk } = useHorariosApi(id_user ? false : true);
    const { GET } = useClientApi(id_user ? false : true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [turnos, setTurnos] = useState<TurnosList[]>([]);
    const [turnosLoading, setTurnosLoading] = useState(true);

    // Lista de horarios a crear
    const [horarios, setHorarios] = useState<{
        dia_semana: DiaSemanaType | "";
        turno_id: string;
        hora_entrada: string;
        hora_salida: string;
        activo: boolean;
        descripcion: string;
    }[]>([
        { dia_semana: "lunes", turno_id: "", hora_entrada: "", hora_salida: "", activo: true, descripcion: "" },
        // { dia_semana: "martes", turno_id: "", hora_entrada: "", hora_salida: "", activo: true, descripcion: "" },
        // { dia_semana: "miercoles", turno_id: "", hora_entrada: "", hora_salida: "", activo: true, descripcion: "" },
        // { dia_semana: "jueves", turno_id: "", hora_entrada: "", hora_salida: "", activo: true, descripcion: "" },
        // { dia_semana: "viernes", turno_id: "", hora_entrada: "", hora_salida: "", activo: true, descripcion: "" },
    ]);

    const [validationErrors, setValidationErrors] = useState<Record<number, Record<string, string>>>({});

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
    }, []);

    // Copiar el primer horario a los demás si se modifica
    useEffect(() => {
        if (horarios.length > 1) {
            const first = horarios[0];
            setHorarios((prev) => prev.map((h, idx) => idx === 0 ? h : {
                ...h,
                turno_id: h.turno_id || first.turno_id,
                hora_entrada: h.hora_entrada || first.hora_entrada,
                hora_salida: h.hora_salida || first.hora_salida,
            }));
        }
    }, [horarios[0].turno_id, horarios[0].hora_entrada, horarios[0].hora_salida]);

    const validateHorario = (horario: any) => {
        const errors: Record<string, string> = {};
        if (!horario.dia_semana) errors.dia_semana = "Día requerido";
        if (!horario.turno_id) errors.turno_id = "Turno requerido";
        if (!horario.hora_entrada.match(/^\d{2}:\d{2}$/)) errors.hora_entrada = "Formato HH:MM";
        if (!horario.hora_salida.match(/^\d{2}:\d{2}$/)) errors.hora_salida = "Formato HH:MM";
        if (horario.hora_entrada && horario.hora_salida && horario.hora_entrada >= horario.hora_salida) errors.hora_salida = "Salida debe ser mayor";
        return errors;
    };

    const validateAll = () => {
        const allErrors: Record<number, Record<string, string>> = {};
        horarios.forEach((h, idx) => {
            const err = validateHorario(h);
            if (Object.keys(err).length > 0) allErrors[idx] = err;
        });
        setValidationErrors(allErrors);
        return Object.keys(allErrors).length === 0;
    };

    const handleChange = (idx: number, field: string, value: any) => {
        setHorarios((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
    };

    const handleDelete = (idx: number) => {
        setHorarios((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleAdd = () => {
        setHorarios((prev) => {
            const last = prev[prev.length - 1];
            return [
                ...prev,
                {
                    dia_semana: "", // El usuario debe elegir el día
                    turno_id: last.turno_id,
                    hora_entrada: last.hora_entrada,
                    hora_salida: last.hora_salida,
                    activo: last.activo,
                    descripcion: last.descripcion,
                }
            ];
        });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAll()) return;
        const userId = session?.user?.id ?? id_user;
        if (!userId) {
            setError("No se pudo obtener tu información de usuario");
            return;
        }
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);
            const horariosBulk = horarios.map((h) => {
                const [horaEntrada, minEntrada] = h.hora_entrada.split(":").map(Number);
                const [horaSalida, minSalida] = h.hora_salida.split(":").map(Number);
                const minutosTotales = (horaSalida * 60 + minSalida) - (horaEntrada * 60 + minEntrada);
                const horasRequeridas = Math.round(minutosTotales / 60);
                return {
                    user_id: userId,
                    dia_semana: h.dia_semana as DiaSemanaType,
                    turno_id: parseInt(h.turno_id),
                    hora_entrada: h.hora_entrada,
                    hora_salida: h.hora_salida,
                    horas_requeridas: horasRequeridas,
                    tolerancia_entrada: 15,
                    tolerancia_salida: 15,
                    activo: h.activo,
                    descripcion: h.descripcion || undefined,
                };
            });
            const response = await createBulk(horariosBulk);
            if (response.alert === "success") {
                setSuccessMessage("¡Horarios creados exitosamente!");
                setTimeout(() => {
                    router.replace("/client/horarios");
                }, 1500);
            } else {
                setError(response.message || "Error al crear los horarios");
            }
        } catch {
            setError("Error al crear los horarios");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Crear Horarios</h1>
                    <p className="text-muted-foreground mt-1">Solicita tus horarios de trabajo</p>
                </div>
            </div>
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {successMessage && (
                <Alert variant="default" className="border-green-600 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                </Alert>
            )}
            <form onSubmit={onSubmit} className="space-y-6">
                {horarios.map((h, idx) => (
                    <Card key={idx} className="mb-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Horario #{idx + 1}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} disabled={horarios.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Día *</label>
                                    <Select value={h.dia_semana} onValueChange={(value) => handleChange(idx, "dia_semana", value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un día" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DIAS_SEMANA.map((dia) => (
                                                <SelectItem key={dia.value} value={dia.value}>{dia.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {validationErrors[idx]?.dia_semana && (
                                        <p className="text-sm text-red-500">{validationErrors[idx].dia_semana}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Turno *</label>
                                    {turnosLoading ? (
                                        <div className="flex items-center justify-center h-10">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    ) : (
                                        <Select value={h.turno_id} onValueChange={(value) => handleChange(idx, "turno_id", value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un turno" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {turnos.map((t: any) => (
                                                    <SelectItem key={t.id} value={String(t.id)}>{t.nombre} ({t.hora_inicio} - {t.hora_fin})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {validationErrors[idx]?.turno_id && (
                                        <p className="text-sm text-red-500">{validationErrors[idx].turno_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hora Entrada *</label>
                                    <Input type="time" value={h.hora_entrada} onChange={(e) => handleChange(idx, "hora_entrada", e.target.value)} />
                                    {validationErrors[idx]?.hora_entrada && (
                                        <p className="text-sm text-red-500">{validationErrors[idx].hora_entrada}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hora Salida *</label>
                                    <Input type="time" value={h.hora_salida} onChange={(e) => handleChange(idx, "hora_salida", e.target.value)} />
                                    {validationErrors[idx]?.hora_salida && (
                                        <p className="text-sm text-red-500">{validationErrors[idx].hora_salida}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Descripción</label>
                                    <Input placeholder="Notas..." value={h.descripcion} onChange={(e) => handleChange(idx, "descripcion", e.target.value)} />
                                </div>
                                <div className="flex flex-row items-center gap-2 mt-4">
                                    <Checkbox checked={h.activo} onCheckedChange={(checked) => handleChange(idx, "activo", Boolean(checked))} />
                                    <span className="text-sm">Activo</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-2" /> Añadir horario
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {saving ? "Creando..." : "Crear Horarios"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
