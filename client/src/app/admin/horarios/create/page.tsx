"use client"

import { BACKEND_ROUTES } from "@/routes/backend.routes"
import { z } from "zod"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldLabel,
    FieldContent,
    FieldError,
    FieldDescription,
} from "@/components/ui/field"
import { TimePicker } from "@/components/ui/time-picker"
import { UserCombobox } from "@/components/ui/user-combobox"
import { toast } from "sonner"
import { ArrowLeft, Calendar, Clock, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CrearHorario, PaginatedResponse, TurnosList } from "@/interfaces"
import { useEffect } from "react"
import { useClientApi } from "@/hooks/useClientApi.hook"

const DIAS_SEMANA = [
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
] as const


const horarioItemSchema = z.object({
    user_id: z.number({ message: "ID de usuario inválido" }).int().positive("Debe seleccionar un usuario"),
    turno_id: z.number({ message: "Debe seleccionar un turno" }).int().positive(),
    dia_semana: z.enum(DIAS_SEMANA, { message: "Debe seleccionar un día de la semana" }),
    hora_entrada: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Formato debe ser HH:MM:SS"),
    hora_salida: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Formato debe ser HH:MM:SS"),
    descripcion: z.string().optional(),
    tolerancia_entrada: z.number().int().min(0).max(120).default(15),
    tolerancia_salida: z.number().int().min(0).max(120).default(15),
    activo: z.boolean().default(true),
}).refine(
    (data) => {
        const [entradaH, entradaM] = data.hora_entrada.split(":").map(Number)
        const [salidaH, salidaM] = data.hora_salida.split(":").map(Number)
        const entradaMinutos = entradaH * 60 + entradaM
        const salidaMinutos = salidaH * 60 + salidaM
        if (salidaMinutos <= entradaMinutos) {
            return true // Turno nocturno válido
        }
        return salidaMinutos > entradaMinutos
    },
    {
        message: "La hora de salida debe ser posterior a la hora de entrada (o cruzar medianoche)",
        path: ["hora_salida"],
    }
)

const horariosSchema = z.object({
    horarios: z.array(horarioItemSchema)
})

type HorarioFormData = z.infer<typeof horariosSchema>

export default function HorarioCreatePage() {
    const router = useRouter()
    const { POST, GET } = useClientApi(false)
    const [tiempoUnidad, setTiempoUnidad] = useState<"horas" | "minutos">("horas")
    const [turnos, setTurnos] = useState<TurnosList[]>([])

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<HorarioFormData>({
        resolver: zodResolver(horariosSchema) as never,
        defaultValues: {
            horarios: [
                {
                    user_id: undefined,
                    turno_id: undefined,
                    dia_semana: "lunes",
                    hora_entrada: "",
                    hora_salida: "",
                    descripcion: "",
                    tolerancia_entrada: 15,
                    tolerancia_salida: 15,
                    activo: true,
                },
            ],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "horarios",
    })

    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    const { data, alert } = await GET<PaginatedResponse<TurnosList>>("/turnos")
                    if (alert === "success" && data) {
                        // resp.data puede ser { turnos: [...] } o un array según backend
                        setTurnos(data.records)
                    }
                } catch (e) {
                    // no bloquear creación si falla
                }
            })()

        return () => {
            mounted = false
        }
    }, [GET])

    const onSubmit = async (values: HorarioFormData) => {
        try {
            // Calcular horas_requeridas automáticamente
            const payload = values.horarios.map((h) => {
                const [entradaH, entradaM] = h.hora_entrada.split(":").map(Number)
                const [salidaH, salidaM] = h.hora_salida.split(":").map(Number)
                const minutosEntrada = entradaH * 60 + entradaM
                const minutosSalida = salidaH * 60 + salidaM
                let minutosTotales = minutosSalida - minutosEntrada
                if (minutosTotales <= 0) {
                    minutosTotales += 24 * 60 // Cruza medianoche
                }
                return {
                    ...h,
                    horas_requeridas: Math.round(minutosTotales / 60),
                }
            })
            const response = await POST(BACKEND_ROUTES.urlHorarios + "/bulk", payload)
            if (response.alert === "success") {
                toast.success("Horarios creados exitosamente", {
                    description: "Los horarios han sido registrados correctamente.",
                })
                reset()
            } else {
                toast.error("Error al crear horarios", {
                    description: response.message || "Ocurrió un error inesperado.",
                })
            }
        } catch (error) {
            toast.error("Error al crear horarios", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error inesperado.",
            })
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Horario</h1>
                <p className="text-muted-foreground mt-2">
                    Registra un horario de trabajo para un usuario específico
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información de los Horarios</CardTitle>
                    <CardDescription>
                        Complete los campos requeridos para crear uno o más horarios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {fields.map((field, idx) => (
                            <div key={field.id} className="border rounded-lg p-4 mb-4 relative">
                                <div className="absolute top-2 right-2">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} disabled={fields.length === 1}>
                                        🗑️
                                    </Button>
                                </div>
                                {/* Usuario */}
                                <Field>
                                    <FieldLabel className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Usuario
                                    </FieldLabel>
                                    <FieldContent>
                                        <Controller
                                            control={control}
                                            name={`horarios.${idx}.user_id`}
                                            render={({ field }) => (
                                                <UserCombobox
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="Buscar y seleccionar usuario..."
                                                />
                                            )}
                                        />
                                        <FieldError errors={[errors.horarios?.[idx]?.user_id && { message: errors.horarios?.[idx]?.user_id?.message }]} />
                                    </FieldContent>
                                </Field>
                                {/* Día de la semana */}
                                <Field>
                                    <FieldLabel className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Día de la semana
                                    </FieldLabel>
                                    <FieldContent>
                                        <Controller
                                            control={control}
                                            name={`horarios.${idx}.dia_semana`}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un día" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DIAS_SEMANA.map((dia) => (
                                                            <SelectItem key={dia} value={dia}>
                                                                {dia.charAt(0) + dia.slice(1).toLowerCase()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <FieldError errors={[errors.horarios?.[idx]?.dia_semana && { message: errors.horarios?.[idx]?.dia_semana?.message }]} />
                                    </FieldContent>
                                </Field>
                                {/* Turno */}
                                <Field>
                                    <FieldLabel>Turno</FieldLabel>
                                    <FieldContent>
                                        <Controller
                                            control={control}
                                            name={`horarios.${idx}.turno_id`}
                                            render={({ field }) => (
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un turno" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {turnos.map((t) => (
                                                            <SelectItem key={t.id} value={String(t.id)}>
                                                                {`${t.nombre} - ${t.hora_inicio ? t.hora_inicio.split(":").slice(0, 2).join(":") : t.hora_inicio} a ${t.hora_fin ? t.hora_fin.split(":").slice(0, 2).join(":") : t.hora_fin}`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <FieldError errors={[errors.horarios?.[idx]?.turno_id && { message: errors.horarios?.[idx]?.turno_id?.message }]} />
                                    </FieldContent>
                                </Field>
                                {/* Horarios */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field>
                                        <FieldLabel className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Hora de entrada
                                        </FieldLabel>
                                        <FieldContent>
                                            <Controller
                                                control={control}
                                                name={`horarios.${idx}.hora_entrada`}
                                                render={({ field }) => (
                                                    <TimePicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        format="HH:mm:ss"
                                                        lang="es-ES"
                                                    />
                                                )}
                                            />
                                            <FieldError errors={[errors.horarios?.[idx]?.hora_entrada && { message: errors.horarios?.[idx]?.hora_entrada?.message }]} />
                                        </FieldContent>
                                    </Field>
                                    <Field>
                                        <FieldLabel className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Hora de salida
                                        </FieldLabel>
                                        <FieldContent>
                                            <Controller
                                                control={control}
                                                name={`horarios.${idx}.hora_salida`}
                                                render={({ field }) => (
                                                    <TimePicker
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        format="HH:mm:ss"
                                                        lang="es-ES"
                                                    />
                                                )}
                                            />
                                            <FieldError errors={[errors.horarios?.[idx]?.hora_salida && { message: errors.horarios?.[idx]?.hora_salida?.message }]} />
                                        </FieldContent>
                                    </Field>
                                </div>
                                {/* Descripción */}
                                <Field>
                                    <FieldLabel>Descripción</FieldLabel>
                                    <FieldContent>
                                        <Controller
                                            control={control}
                                            name={`horarios.${idx}.descripcion`}
                                            render={({ field }) => (
                                                <Input
                                                    placeholder="Notas..."
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </FieldContent>
                                </Field>
                                {/* Tolerancias */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field>
                                        <FieldLabel>Tolerancia de entrada (min)</FieldLabel>
                                        <FieldContent>
                                            <Controller
                                                control={control}
                                                name={`horarios.${idx}.tolerancia_entrada`}
                                                render={({ field }) => (
                                                    <Input
                                                        type="number"
                                                        placeholder="15"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            />
                                            <FieldError errors={[errors.horarios?.[idx]?.tolerancia_entrada && { message: errors.horarios?.[idx]?.tolerancia_entrada?.message }]} />
                                        </FieldContent>
                                    </Field>
                                    <Field>
                                        <FieldLabel>Tolerancia de salida (min)</FieldLabel>
                                        <FieldContent>
                                            <Controller
                                                control={control}
                                                name={`horarios.${idx}.tolerancia_salida`}
                                                render={({ field }) => (
                                                    <Input
                                                        type="number"
                                                        placeholder="15"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            />
                                            <FieldError errors={[errors.horarios?.[idx]?.tolerancia_salida && { message: errors.horarios?.[idx]?.tolerancia_salida?.message }]} />
                                        </FieldContent>
                                    </Field>
                                </div>
                                {/* Estado activo */}
                                <Field>
                                    <FieldContent>
                                        <Controller
                                            control={control}
                                            name={`horarios.${idx}.activo`}
                                            render={({ field }) => (
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <div className="flex flex-col">
                                                        <FieldLabel className="mb-0!">
                                                            Horario activo
                                                        </FieldLabel>
                                                        <FieldDescription className="mt-0!">
                                                            El horario estará vigente inmediatamente
                                                        </FieldDescription>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                        <FieldError errors={[errors.horarios?.[idx]?.activo && { message: errors.horarios?.[idx]?.activo?.message }]} />
                                    </FieldContent>
                                </Field>
                            </div>
                        ))}
                        <div className="flex gap-2 mb-4">
                            <Button type="button" variant="outline" onClick={() => append({
                                user_id: 0,
                                turno_id: 0,
                                dia_semana: "lunes",
                                hora_entrada: "",
                                hora_salida: "",
                                descripcion: "",
                                tolerancia_entrada: 15,
                                tolerancia_salida: 15,
                                activo: true,
                            })}>
                                ➕ Añadir horario
                            </Button>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Crear Horarios"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}