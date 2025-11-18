"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";
import { HorariosList } from "@/interfaces";
import BtnLink from "@/components/btn-link";
import { CLIENT_ROUTES } from "@/routes/client.routes";
import { toast } from "sonner";

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

export default function HorariosPage() {
    const router = useRouter();
    const { list, delete_ } = useHorariosApi();

    const [horarios, setHorarios] = useState<HorariosList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [diaSemana, setDiaSemana] = useState<DiaSemanaType | "">("");
    const [activo, setActivo] = useState<"true" | "false">("true");

    const fetchHorarios = async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: { dia_semana?: DiaSemanaType; activo?: boolean } = {};

            if (diaSemana) {
                filters.dia_semana = diaSemana;
            }

            if (activo) {
                filters.activo = activo === "true";
            }

            const response = await list(filters);

            if (response.alert === "success" && response.data) {
                // response.data puede ser un array o un objeto con records
                let data: HorariosList[] = [];

                if (Array.isArray(response.data)) {
                    data = response.data;
                } else if (response.data && typeof response.data === 'object' && 'records' in response.data) {
                    data = ((response.data as unknown as Record<string, unknown>).records as HorariosList[]) || [];
                }

                setHorarios(data);
            } else {
                setError(response.message || "Error al cargar horarios");
            }
        } catch (err) {
            setError("Error al cargar horarios");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const { alert } = await delete_(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        alert === "success" ? toast.success("Horario eliminado correctamente") : toast.error("Error al eliminar el horario");
        fetchHorarios();
    }

    useEffect(() => {


        fetchHorarios();
    }, [diaSemana, activo]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 ">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis Horarios</h1>
                    <p className="text-muted-foreground mt-2">
                        Consulta tus horarios de trabajo asignados
                    </p>
                </div>
                <BtnLink
                    data={{
                        href: `${CLIENT_ROUTES.urlUserHorarios}/create`,
                        Icon: Plus,
                        name: "Crear Horario"
                    }} />
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Filtro por Día */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Día de la Semana</label>
                            <Select
                                value={diaSemana}
                                onValueChange={(value) =>
                                    setDiaSemana(value === "all" ? "" : (value as DiaSemanaType))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los días" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los días</SelectItem>
                                    {DIAS_SEMANA.map((dia) => (
                                        <SelectItem key={dia.value} value={dia.value}>
                                            {dia.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtro por Estado */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estado</label>
                            <Select
                                value={activo}
                                onValueChange={(value) =>
                                    setActivo(value as "true" | "false")
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Activo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Activo</SelectItem>
                                    <SelectItem value="false">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mensaje de error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Tabla de horarios */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Listado de Horarios ({horarios.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {horarios.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                No hay horarios disponibles con los filtros seleccionados
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Día</TableHead>
                                        <TableHead>Turno</TableHead>
                                        <TableHead>Horario</TableHead>
                                        <TableHead>Horas Requeridas</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {horarios.map((horario) => (
                                        <TableRow key={horario.id}>
                                            <TableCell className="font-medium capitalize">
                                                {horario.dia_semana || "N/A"}
                                            </TableCell>
                                            <TableCell>{horario.turno_nombre || "N/A"}</TableCell>
                                            <TableCell>
                                                {horario.hora_entrada && horario.hora_salida
                                                    ? `${horario.hora_entrada} - ${horario.hora_salida}`
                                                    : "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                {horario.horas_requeridas
                                                    ? `${horario.horas_requeridas}h`
                                                    : "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={horario.activo ? "default" : "secondary"}
                                                >
                                                    {horario.activo ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.replace(`/client/horarios/${horario.id}`)}
                                                >
                                                    Ver Detalle
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(horario.id)}
                                                >
                                                    Eliminar
                                                </Button>

                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}