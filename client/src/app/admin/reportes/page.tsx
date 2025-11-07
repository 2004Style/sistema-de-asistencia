"use client";

import { useState, useEffect } from "react";
import { useReportesApi } from "@/hooks/useReportesApi.hook";
import { ResportesList } from "@/interfaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Download, Trash2, RefreshCw, CheckCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ReportType = "diario" | "semanal" | "mensual" | "tardanzas" | "inasistencias";

export default function ReportesPage() {
    const { list, generarDiario, generarSemanal, generarMensual, generarTardanzas, generarInasistencias, descargar, eliminar, state } = useReportesApi();

    const [reportes, setReportes] = useState<ResportesList[]>([]);
    const [loading, setLoading] = useState(true);
    const [generando, setGenerando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Form state
    const [tipoReporte, setTipoReporte] = useState<ReportType>("diario");
    const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
    const [fechaInicio, setFechaInicio] = useState(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split("T")[0]);
    const [mes, setMes] = useState((new Date().getMonth() + 1).toString());
    const [anio, setAnio] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        cargarReportes();
    }, []);

    const cargarReportes = async () => {
        setLoading(true);
        const response = await list(1, 20);

        if (response.alert === "success" && response.data) {
            const data = response.data as any;
            setReportes(data.data || data);
        }

        setLoading(false);
    };

    const handleGenerarReporte = async () => {
        setGenerando(true);
        setMensaje(null);

        let response;

        try {
            switch (tipoReporte) {
                case "diario":
                    response = await generarDiario(fecha);
                    break;
                case "semanal":
                    response = await generarSemanal(fechaInicio, fechaFin);
                    break;
                case "mensual":
                    response = await generarMensual(Number(mes), Number(anio));
                    break;
                case "tardanzas":
                    response = await generarTardanzas(fechaInicio, fechaFin);
                    break;
                case "inasistencias":
                    response = await generarInasistencias(fechaInicio, fechaFin);
                    break;
                default:
                    response = { alert: "error" as const, message: "Tipo de reporte no válido" };
            }

            if (response.alert === "success") {
                setMensaje({ tipo: "success", texto: "Reporte generado exitosamente" });
                cargarReportes();
            } else {
                setMensaje({ tipo: "error", texto: response.message || "Error al generar reporte" });
            }
        } catch (error) {
            setMensaje({ tipo: "error", texto: "Error inesperado" });
        }

        setGenerando(false);
    };

    const handleDescargar = async (ruta: string) => {
        try {
            await descargar(ruta);
            setMensaje({ tipo: "success", texto: "Reporte descargado" });
        } catch {
            setMensaje({ tipo: "error", texto: "Error al descargar" });
        }
    };

    const handleEliminar = async () => {
        if (!selectedId) return;

        const response = await eliminar(selectedId);

        if (response.alert === "success") {
            setMensaje({ tipo: "success", texto: "Reporte eliminado" });
            cargarReportes();
        } else {
            setMensaje({ tipo: "error", texto: "Error al eliminar" });
        }

        setShowDeleteDialog(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
                <p className="text-muted-foreground mt-2">
                    Genera y gestiona reportes del sistema de asistencia
                </p>
            </div>

            {/* Message Alert */}
            {mensaje && (
                <Alert variant={mensaje.tipo === "error" ? "destructive" : "default"}>
                    {mensaje.tipo === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{mensaje.texto}</AlertDescription>
                </Alert>
            )}

            {/* Generador de Reportes */}
            <Card>
                <CardHeader>
                    <CardTitle>Generar Reporte</CardTitle>
                    <CardDescription>
                        Selecciona el tipo de reporte y los parámetros deseados
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Reporte */}
                        <div className="space-y-2">
                            <Label htmlFor="tipo">Tipo de Reporte *</Label>
                            <Select value={tipoReporte} onValueChange={(value) => setTipoReporte(value as ReportType)}>
                                <SelectTrigger id="tipo">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="diario">Diario</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="mensual">Mensual</SelectItem>
                                    <SelectItem value="tardanzas">Tardanzas</SelectItem>
                                    <SelectItem value="inasistencias">Inasistencias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Campos Condicionales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tipoReporte === "diario" && (
                            <div className="space-y-2">
                                <Label htmlFor="fecha">Fecha *</Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    disabled={generando}
                                />
                            </div>
                        )}

                        {tipoReporte === "semanal" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                                    <Input
                                        id="fechaInicio"
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        disabled={generando}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fechaFin">Fecha Fin *</Label>
                                    <Input
                                        id="fechaFin"
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        disabled={generando}
                                    />
                                </div>
                            </>
                        )}

                        {tipoReporte === "mensual" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="mes">Mes *</Label>
                                    <Select value={mes} onValueChange={setMes}>
                                        <SelectTrigger id="mes">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <SelectItem key={i + 1} value={String(i + 1)}>
                                                    {new Date(2024, i).toLocaleString("es", { month: "long" })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="anio">Año *</Label>
                                    <Input
                                        id="anio"
                                        type="number"
                                        value={anio}
                                        onChange={(e) => setAnio(e.target.value)}
                                        disabled={generando}
                                        min="2020"
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                            </>
                        )}

                        {(tipoReporte === "tardanzas" || tipoReporte === "inasistencias") && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="fechaInicio2">Fecha Inicio *</Label>
                                    <Input
                                        id="fechaInicio2"
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        disabled={generando}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fechaFin2">Fecha Fin *</Label>
                                    <Input
                                        id="fechaFin2"
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        disabled={generando}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Botón Generar */}
                    <Button
                        onClick={handleGenerarReporte}
                        disabled={generando || state.loading}
                        className="w-full md:w-auto"
                    >
                        {(generando || state.loading) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Generar Reporte
                    </Button>
                </CardContent>
            </Card>

            {/* Lista de Reportes */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Reportes Generados</CardTitle>
                        <CardDescription>
                            Descarga o elimina reportes anteriores
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={cargarReportes}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : reportes.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No hay reportes generados aún
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Formato</TableHead>
                                        <TableHead className="text-right">Tamaño</TableHead>
                                        <TableHead>Creado</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportes.map((reporte) => (
                                        <TableRow key={reporte.id}>
                                            <TableCell className="font-medium">{reporte.nombre}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{reporte.tipo}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge>{reporte.formato.toUpperCase()}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {(reporte.tamano / 1024).toFixed(2)} KB
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(reporte.fecha_creacion).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDescargar(reporte.ruta)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedId(reporte.ruta);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogTitle>Eliminar reporte</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro que deseas eliminar este reporte?
                        Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleEliminar}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
