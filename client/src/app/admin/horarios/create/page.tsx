"use client"

import { BACKEND_ROUTES } from "@/routes/backend.routes"
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
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


const horarioSchema = z.object({
    user_id: z
        .number({ message: "ID de usuario inválido" })
        .int()
        .positive("Debe seleccionar un usuario"),
    turno_id: z.number({ message: "Debe seleccionar un turno" }).int().positive(),
    dia_semana: z.enum(DIAS_SEMANA, {
        message: "Debe seleccionar un día de la semana",
    }),
    hora_entrada: z
        .string()
        .regex(/^\d{2}:\d{2}:\d{2}$/, "Formato debe ser HH:MM:SS")
        .refine((time) => {
            const [hours, minutes] = time.split(":").map(Number)
            return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
        }, "Hora inválida"),
    hora_salida: z
        .string()
        .regex(/^\d{2}:\d{2}:\d{2}$/, "Formato debe ser HH:MM:SS")
        .refine((time) => {
            const [hours, minutes] = time.split(":").map(Number)
            return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
        }, "Hora inválida"),
    horas_requeridas: z
        .number({ message: "Debe ser un número" })
        .int()
        .min(1, "Debe ser al menos 1 minuto")
        .max(1440, "No puede exceder 24 horas (1440 minutos)"),
    descripcion: z.string().optional(),
    tolerancia_entrada: z
        .number()
        .int()
        .min(0, "No puede ser negativo")
        .max(120, "No puede exceder 120 minutos")
        .default(15),
    tolerancia_salida: z
        .number()
        .int()
        .min(0, "No puede ser negativo")
        .max(120, "No puede exceder 120 minutos")
        .default(15),
    activo: z.boolean().default(true),
}).refine(
    (data) => {
        const [entradaH, entradaM] = data.hora_entrada.split(":").map(Number)
        const [salidaH, salidaM] = data.hora_salida.split(":").map(Number)
        const entradaMinutos = entradaH * 60 + entradaM
        const salidaMinutos = salidaH * 60 + salidaM

        // Si la salida es menor que la entrada, asumir que cruza medianoche
        if (salidaMinutos <= entradaMinutos) {
            return true // Turno nocturno válido (ej: 22:00 - 06:00)
        }

        return salidaMinutos > entradaMinutos
    },
    {
        message: "La hora de salida debe ser posterior a la hora de entrada (o cruzar medianoche para turnos nocturnos)",
        path: ["hora_salida"],
    }
)

type HorarioFormData = z.infer<typeof horarioSchema>

export default function HorarioCreatePage() {
    const router = useRouter()
    const { post, get } = useClientApi(false)
    const [tiempoUnidad, setTiempoUnidad] = useState<"horas" | "minutos">("horas")
    const [turnos, setTurnos] = useState<TurnosList[]>([])

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<HorarioFormData>({
        resolver: zodResolver(horarioSchema) as never,
        defaultValues: {
            tolerancia_entrada: 15,
            tolerancia_salida: 15,
            activo: true,
        },
    })

    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    const { data, alert } = await get<PaginatedResponse<TurnosList>>("/turnos")
                    if (alert === "success" && data) {
                        // resp.data puede ser { turnos: [...] } o un array según backend
                        console.log(data)
                        setTurnos(data.records)
                    }
                } catch (e) {
                    // no bloquear creación si falla
                    console.error("Error cargando turnos:", e)
                }
            })()

        return () => {
            mounted = false
        }
    }, [get])

    const onSubmit = async (values: HorarioFormData) => {
        try {
            const payload: CrearHorario = {
                user_id: values.user_id,
                turno_id: values.turno_id,
                dia_semana: values.dia_semana,
                hora_entrada: values.hora_entrada,
                hora_salida: values.hora_salida,
                horas_requeridas: values.horas_requeridas,
                descripcion: values.descripcion,
                tolerancia_entrada: values.tolerancia_entrada,
                tolerancia_salida: values.tolerancia_salida,
                activo: values.activo,
            }

            const response = await post(BACKEND_ROUTES.urlHorarios, payload)

            if (response.alert === "success") {
                toast.success("Horario creado exitosamente", {
                    description: "El horario ha sido registrado correctamente.",
                })
                reset()
                // Opcional: redirigir a lista de horarios
                // router.push("/admin/horarios")
            } else {
                toast.error("Error al crear horario", {
                    description: response.message || "Ocurrió un error inesperado.",
                })
            }
        } catch (error) {
            toast.error("Error al crear horario", {
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
                    <CardTitle>Información del Horario</CardTitle>
                    <CardDescription>
                        Complete los campos requeridos para crear un nuevo horario
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Usuario */}
                        <Field>
                            <FieldLabel className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Usuario
                            </FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={control}
                                    name="user_id"
                                    render={({ field }) => (
                                        <UserCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Buscar y seleccionar usuario..."
                                        />
                                    )}
                                />
                                <FieldDescription>
                                    Busque por nombre, email o código de usuario
                                </FieldDescription>
                                <FieldError
                                    errors={[errors.user_id && { message: errors.user_id.message }]}
                                />
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
                                    name="dia_semana"
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un día" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DIAS_SEMANA.map((dia) => (
                                                    <SelectItem key={dia} value={dia}>
                                                        {dia.charAt(0) +
                                                            dia.slice(1).toLowerCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldError
                                    errors={[
                                        errors.dia_semana && { message: errors.dia_semana.message },
                                    ]}
                                />
                            </FieldContent>
                        </Field>

                        {/* Turno */}
                        <Field>
                            <FieldLabel>Turno</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={control}
                                    name="turno_id"
                                    render={({ field }) => (
                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un turno" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {turnos.map((t) => (
                                                    <SelectItem key={t.id} value={String(t.id)}>
                                                        {`${t.nombre} - ${t.hora_inicio
                                                            ? t.hora_inicio.split(":").slice(0, 2).join(":")
                                                            : t.hora_inicio
                                                            } a ${t.hora_fin
                                                                ? t.hora_fin.split(":").slice(0, 2).join(":")
                                                                : t.hora_fin
                                                            }`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldDescription>Seleccione el turno asociado al horario</FieldDescription>
                                <FieldError errors={[errors.turno_id && { message: errors.turno_id.message }]} />
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
                                        name="hora_entrada"
                                        render={({ field }) => (
                                            <TimePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                format="HH:mm:ss"
                                                lang="es-ES"
                                            />
                                        )}
                                    />
                                    <FieldDescription>Formato: HH:MM (24h)</FieldDescription>

                                    <FieldError
                                        errors={[
                                            errors.hora_entrada && {
                                                message: errors.hora_entrada.message,
                                            },
                                        ]}
                                    />
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
                                        name="hora_salida"
                                        render={({ field }) => (
                                            <TimePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                format="HH:mm:ss"
                                                lang="es-ES"
                                            />
                                        )}
                                    />
                                    <FieldDescription>Formato: HH:MM (24h)</FieldDescription>

                                    <FieldError
                                        errors={[
                                            errors.hora_salida && {
                                                message: errors.hora_salida.message,
                                            },
                                        ]}
                                    />
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Horas requeridas */}
                        <Field>
                            <FieldLabel>Tiempo requerido</FieldLabel>
                            <FieldContent>
                                <div className="flex gap-2">
                                    <Controller
                                        control={control}
                                        name="horas_requeridas"
                                        render={({ field }) => (
                                            <Input
                                                type="number"
                                                placeholder={tiempoUnidad === "horas" ? "8" : "480"}
                                                value={
                                                    tiempoUnidad === "horas"
                                                        ? field.value
                                                            ? Math.floor(field.value / 60)
                                                            : ""
                                                        : field.value || ""
                                                }
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (value === "") {
                                                        field.onChange(undefined)
                                                        return
                                                    }
                                                    const numValue = parseFloat(value)
                                                    if (isNaN(numValue)) return

                                                    // Convertir a minutos si está en horas
                                                    const minutos =
                                                        tiempoUnidad === "horas"
                                                            ? Math.round(numValue * 60)
                                                            : numValue
                                                    field.onChange(minutos)
                                                }}
                                                className="flex-1"
                                            />
                                        )}
                                    />
                                    <Select
                                        value={tiempoUnidad}
                                        onValueChange={(value: "horas" | "minutos") =>
                                            setTiempoUnidad(value)
                                        }
                                    >
                                        <SelectTrigger className="w-[130px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="horas">Horas</SelectItem>
                                            <SelectItem value="minutos">Minutos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <FieldDescription>
                                    {tiempoUnidad === "horas"
                                        ? "Ingrese las horas de trabajo (ej: 8 horas = 480 minutos)"
                                        : "Total de minutos requeridos (ej: 480 minutos = 8 horas)"}
                                </FieldDescription>
                                <FieldError
                                    errors={[
                                        errors.horas_requeridas && {
                                            message: errors.horas_requeridas.message,
                                        },
                                    ]}
                                />
                            </FieldContent>
                        </Field>

                        {/* Tolerancias */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field>
                                <FieldLabel>Tolerancia de entrada (min)</FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="number"
                                        placeholder="15"
                                        {...register("tolerancia_entrada", {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <FieldDescription>
                                        Minutos de gracia para la entrada
                                    </FieldDescription>
                                    <FieldError
                                        errors={[
                                            errors.tolerancia_entrada && {
                                                message: errors.tolerancia_entrada.message,
                                            },
                                        ]}
                                    />
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel>Tolerancia de salida (min)</FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="number"
                                        placeholder="15"
                                        {...register("tolerancia_salida", {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <FieldDescription>
                                        Minutos de gracia para la salida
                                    </FieldDescription>
                                    <FieldError
                                        errors={[
                                            errors.tolerancia_salida && {
                                                message: errors.tolerancia_salida.message,
                                            },
                                        ]}
                                    />
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Estado activo */}
                        <Field>
                            <FieldContent>
                                <Controller
                                    control={control}
                                    name="activo"
                                    render={({ field }) => (
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <div className="flex flex-col">
                                                <FieldLabel className="!mb-0">
                                                    Horario activo
                                                </FieldLabel>
                                                <FieldDescription className="!mt-0">
                                                    El horario estará vigente inmediatamente
                                                </FieldDescription>
                                            </div>
                                        </div>
                                    )}
                                />
                                <FieldError
                                    errors={[errors.activo && { message: errors.activo.message }]}
                                />
                            </FieldContent>
                        </Field>

                        {/* Botones de acción */}
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
                                {isSubmitting ? "Guardando..." : "Crear Horario"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}