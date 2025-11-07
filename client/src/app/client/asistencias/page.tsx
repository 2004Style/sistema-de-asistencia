"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAsistenciasApi } from "@/hooks/useAsistenciasApi.hook";
import { AsistenciaList } from "@/interfaces/asistencias.interface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, Eye, Loader } from "lucide-react";

type StatusType = "presente" | "ausente" | "tarde" | "justificado" | "permiso";

export default function AsistenciasPage() {
    const { list, state } = useAsistenciasApi();

    const [asistencias, setAsistencias] = useState<AsistenciaList[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [estado, setEstado] = useState<StatusType | "">("");

    useEffect(() => {
        cargarAsistencias();
    }, [page, fechaInicio, fechaFin, estado]);

    const cargarAsistencias = async () => {
        setLoading(true);
        const filters: any = {};

        if (fechaInicio) filters.fecha_inicio = fechaInicio;
        if (fechaFin) filters.fecha_fin = fechaFin;
        if (estado) filters.estado = estado;

        const response = await list(page, pageSize, filters);

        if (response.alert === "success" && response.data) {
            setAsistencias(response.data.records);
            setTotal(response.data.total);
        }

        setLoading(false);
    };

    const getEstadoBadge = (estado: string) => {
        const variants: Record<
            string,
            { label: string; color: string }
        > = {
            presente: { label: "✓ Presente", color: "bg-green-500" },
            ausente: { label: "✗ Ausente", color: "bg-red-500" },
            tarde: { label: "⏰ Tarde", color: "bg-yellow-500" },
            justificado: { label: "✓ Justificado", color: "bg-blue-500" },
            permiso: { label: "🔷 Permiso", color: "bg-purple-500" },
        };

        const variant = variants[estado] || variants.ausente;

        return <Badge className={`${variant.color} text-white`}>{variant.label}</Badge>;
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="w-full space-y-6 p-4 md:p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Mis Asistencias</h1>
                <p className="text-muted-foreground">
                    Historial de asistencias y ausencias
                </p>
            </div>

            {/* Filtros */}
            <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                Desde
                            </label>
                            <Input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => {
                                    setFechaInicio(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Hasta</label>
                            <Input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => {
                                    setFechaFin(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Estado</label>
                            <Select
                                value={estado || "all"}
                                onValueChange={(value) => {
                                    setEstado(value === "all" ? "" : (value as StatusType));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los estados" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="presente">Presente</SelectItem>
                                    <SelectItem value="ausente">Ausente</SelectItem>
                                    <SelectItem value="tarde">Tarde</SelectItem>
                                    <SelectItem value="justificado">Justificado</SelectItem>
                                    <SelectItem value="permiso">Permiso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={() => {
                                    setFechaInicio("");
                                    setFechaFin("");
                                    setEstado("");
                                    setPage(1);
                                }}
                                variant="outline"
                                className="w-full"
                            >
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
                <CardContent className="p-0">
                    {loading || state.loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : asistencias.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <AlertTriangle className="w-12 h-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-center">
                                No hay asistencias registradas
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Entrada</TableHead>
                                            <TableHead>Salida</TableHead>
                                            <TableHead>Tardanza</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {asistencias.map((asistencia) => (
                                            <TableRow key={asistencia.id}>
                                                <TableCell className="font-medium">
                                                    {new Date(asistencia.fecha).toLocaleDateString("es-ES", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {asistencia.hora_entrada || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {asistencia.hora_salida || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {asistencia.minutos_tardanza > 0 ? (
                                                        <span className="text-yellow-600 font-medium">
                                                            {asistencia.minutos_tardanza} min
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </TableCell>
                                                <TableCell>{getEstadoBadge(asistencia.estado)}</TableCell>
                                                <TableCell>
                                                    <Link href={`/client/asistencias/${asistencia.id}`}>
                                                        <Button size="sm" variant="outline" className="gap-2">
                                                            <Eye className="w-4 h-4" />
                                                            Ver
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Página {page} de {totalPages} ({total} total)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            variant="outline"
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page === totalPages}
                                            variant="outline"
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Alert de error */}
            {state.alert === "error" && state.error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}