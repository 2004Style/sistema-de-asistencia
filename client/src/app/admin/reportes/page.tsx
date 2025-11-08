"use client";

import { useState, useEffect } from "react";
import { useReportesApi } from "@/hooks/useReportesApi.hook";
import { ResportesList, ReportesListResponse } from "@/interfaces";
import { validatePaginatedResponse, getErrorMessage, ensureArray } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Download, Trash2, RefreshCw, CheckCircle, FileText, Calendar, Mail, BarChart3 } from "lucide-react";
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
type FormatoReporte = "pdf" | "excel" | "both";

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
    const [formato, setFormato] = useState<FormatoReporte>("both");
    const [enviarEmail, setEnviarEmail] = useState(false);

    useEffect(() => {
        cargarReportes();
    }, []);

    const cargarReportes = async () => {
        setLoading(true);
        try {
            const response = await list(1, 20);

            if (response.alert === "success" && response.data) {
                const validated = validatePaginatedResponse<ResportesList>(response.data);
                setReportes(validated.records);
            } else {
                setReportes([]);
                if (response.alert === "error") {
                    setMensaje({ tipo: "error", texto: response.message || "Error al cargar reportes" });
                }
            }
        } catch (error) {
            setReportes([]);
            setMensaje({ tipo: "error", texto: getErrorMessage(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerarReporte = async () => {
        setGenerando(true);
        setMensaje(null);

        try {
            let response;

            switch (tipoReporte) {
                case "diario":
                    response = await generarDiario(fecha, formato, undefined, enviarEmail);
                    break;
                case "semanal":
                    response = await generarSemanal(fechaInicio, fechaFin, formato, undefined, enviarEmail);
                    break;
                case "mensual":
                    response = await generarMensual(Number(mes), Number(anio), formato, undefined, enviarEmail);
                    break;
                case "tardanzas":
                    response = await generarTardanzas(fechaInicio, fechaFin, formato, undefined, enviarEmail);
                    break;
                case "inasistencias":
                    response = await generarInasistencias(fechaInicio, fechaFin, formato, undefined, enviarEmail);
                    break;
                default:
                    response = { alert: "error" as const, message: "Tipo de reporte no válido" };
            }

            if (response?.alert === "success") {
                setMensaje({ tipo: "success", texto: "Reporte generado exitosamente" });
                await cargarReportes();
            } else {
                setMensaje({
                    tipo: "error",
                    texto: response?.message || "Error al generar reporte"
                });
            }
        } catch (error) {
            setMensaje({ tipo: "error", texto: getErrorMessage(error) });
        } finally {
            setGenerando(false);
        }
    };

    const handleDescargar = async (ruta: string) => {
        try {
            const response = await descargar(ruta);
            if (response.alert === "success") {
                setMensaje({ tipo: "success", texto: "Reporte descargado" });
            } else {
                setMensaje({ tipo: "error", texto: response.message || "Error al descargar" });
            }
        } catch (error) {
            setMensaje({ tipo: "error", texto: getErrorMessage(error) });
        }
    };

    const handleEliminar = async () => {
        if (!selectedId) return;

        try {
            const response = await eliminar(selectedId);

            if (response?.alert === "success") {
                setMensaje({ tipo: "success", texto: "Reporte eliminado" });
                await cargarReportes();
            } else {
                setMensaje({ tipo: "error", texto: response?.message || "Error al eliminar" });
            }
        } catch (error) {
            setMensaje({ tipo: "error", texto: getErrorMessage(error) });
        }

        setShowDeleteDialog(false);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:py-6 md:px-8">
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

            {/* Generador de Reportes - Diseño Moderno */}
            <Card className="border-0 shadow-lg bg-primary">
                <CardHeader className="pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg">
                            <BarChart3 className="h-6 w-6 " />
                        </div>
                        <div>
                            <CardTitle className=" text-xl">Generar Reporte</CardTitle>
                            <CardDescription className="">
                                Selecciona el tipo y parámetros para generar tu reporte
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                    {/* Fila 1: Tipo y Formato */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tipo de Reporte */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 " />
                                <Label htmlFor="tipo" className=" font-semibold">Tipo de Reporte *</Label>
                            </div>
                            <Select value={tipoReporte} onValueChange={(value) => setTipoReporte(value as ReportType)}>
                                <SelectTrigger id="tipo" className=" border-slate-600 ">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className=" border-slate-600">
                                    <SelectItem value="diario" className="">Diario</SelectItem>
                                    <SelectItem value="semanal" className="">Semanal</SelectItem>
                                    <SelectItem value="mensual" className="">Mensual</SelectItem>
                                    <SelectItem value="tardanzas" className="">Tardanzas</SelectItem>
                                    <SelectItem value="inasistencias" className="">Inasistencias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Formato */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 " />
                                <Label htmlFor="formato" className=" font-semibold">Formato</Label>
                            </div>
                            <Select value={formato} onValueChange={(value) => setFormato(value as FormatoReporte)} >
                                <SelectTrigger id="formato" className=" border-slate-600 ">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className=" border-slate-600">
                                    <SelectItem value="pdf" className=" focus:bg-red-600 focus:text-white">📄 PDF</SelectItem>
                                    <SelectItem value="excel" className=" focus:bg-green-600 focus:text-white">📊 Excel</SelectItem>
                                    <SelectItem value="both" className=" focus:bg-blue-600 focus:text-white">📦 Ambos (PDF y Excel)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Opciones adicionales - Card destacada */}
                    <div className=" border border-slate-600 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 " />
                                <div>
                                    <Label htmlFor="enviarEmail" className=" font-semibold cursor-pointer block">
                                        Enviar por Email
                                    </Label>
                                    <p className="text-xs ">Se enviará a tu correo registrado</p>
                                </div>
                            </div>
                            <Checkbox
                                id="enviarEmail"
                                checked={enviarEmail}
                                onCheckedChange={(checked) => setEnviarEmail(checked as boolean)}
                                disabled={generando}
                                className="border-slate-500"
                            />
                        </div>
                    </div>

                    {/* Campos Condicionales - Con Fondo Sutil */}
                    <div className=" border border-slate-600 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-4 w-4 " />
                            <span className="text-sm font-semibold ">Parámetros</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tipoReporte === "diario" && (
                                <div className="space-y-2">
                                    <Label htmlFor="fecha" className="">Fecha *</Label>
                                    <Input
                                        id="fecha"
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        disabled={generando}
                                        className=" border-slate-500 "
                                    />
                                </div>
                            )}

                            {tipoReporte === "semanal" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="fechaInicio" className="">Fecha Inicio *</Label>
                                        <Input
                                            id="fechaInicio"
                                            type="date"
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                            disabled={generando}
                                            className=" border-slate-500 "
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fechaFin" className="">Fecha Fin *</Label>
                                        <Input
                                            id="fechaFin"
                                            type="date"
                                            value={fechaFin}
                                            onChange={(e) => setFechaFin(e.target.value)}
                                            disabled={generando}
                                            className=" border-slate-500 "
                                        />
                                    </div>
                                </>
                            )}

                            {tipoReporte === "mensual" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="mes" className="">Mes *</Label>
                                        <Select value={mes} onValueChange={setMes}>
                                            <SelectTrigger id="mes" className=" border-slate-500 ">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className=" border-slate-600">
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <SelectItem key={i + 1} value={String(i + 1)} className="">
                                                        {new Date(2024, i).toLocaleString("es", { month: "long" })}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="anio" className="">Año *</Label>
                                        <Input
                                            id="anio"
                                            type="number"
                                            value={anio}
                                            onChange={(e) => setAnio(e.target.value)}
                                            disabled={generando}
                                            min="2020"
                                            max={new Date().getFullYear()}
                                            className=" border-slate-500 "
                                        />
                                    </div>
                                </>
                            )}

                            {(tipoReporte === "tardanzas" || tipoReporte === "inasistencias") && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="fechaInicio2" className="">Fecha Inicio *</Label>
                                        <Input
                                            id="fechaInicio2"
                                            type="date"
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                            disabled={generando}
                                            className=" border-slate-500 "
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fechaFin2" className="">Fecha Fin *</Label>
                                        <Input
                                            id="fechaFin2"
                                            type="date"
                                            value={fechaFin}
                                            onChange={(e) => setFechaFin(e.target.value)}
                                            disabled={generando}
                                            className=" border-slate-500 "
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botón Generar - Mejorado */}
                    <Button
                        onClick={handleGenerarReporte}
                        disabled={generando || state.loading}
                        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600  font-semibold py-2 h-auto text-white"
                    >
                        {(generando || state.loading) && (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        )}
                        {generando ? "Generando..." : "Generar Reporte"}
                    </Button>
                </CardContent>
            </Card>

            {/* Lista de Reportes - Mejorada */}
            <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className=" border-slate-700 flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg">
                            <FileText className="h-6 w-6 " />
                        </div>
                        <div>
                            <CardTitle className=" text-xl">Reportes Generados</CardTitle>
                            <CardDescription className="">
                                {reportes.length} reporte{reportes.length !== 1 ? "s" : ""} disponible{reportes.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={cargarReportes}
                        disabled={loading}
                        className="text-slate-400 hover: hover:bg-slate-700"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-700 mb-3" />
                            <p className="text-slate-400">Cargando reportes...</p>
                        </div>
                    ) : reportes.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No hay reportes generados aún</p>
                            <p className="text-slate-500 text-sm">Genera un reporte arriba para que aparezca aquí</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-700 hover:bg-transparent">
                                        <TableHead className="text-slate-400">Nombre</TableHead>
                                        <TableHead className="text-slate-400">Tipo</TableHead>
                                        <TableHead className="text-slate-400">Formato</TableHead>
                                        <TableHead className="text-right text-slate-400">Tamaño</TableHead>
                                        <TableHead className="text-slate-400">Creado</TableHead>
                                        <TableHead className="text-slate-400">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportes.map((reporte, index) => (
                                        <TableRow key={reporte.id} className="border-b border-slate-700 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="font-medium ">{reporte.nombre}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-blue-500/20 text-blue-700 border-blue-700/30 capitalize"
                                                >
                                                    {reporte.tipo}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${reporte.formato === "pdf"
                                                    ? "bg-red-500/20 text-red-700 border border-red-700/30"
                                                    : reporte.formato === "xlsx"
                                                        ? "bg-green-500/20 text-green-700 border border-green-700/30"
                                                        : "bg-purple-500/20 text-purple-700 border border-purple-700/30"
                                                    }`}>
                                                    {reporte.formato === "xlsx" ? "Excel" : reporte.formato.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-slate-400">
                                                {(reporte.tamano / 1024).toFixed(2)} KB
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-400">
                                                {new Date(reporte.fecha_creacion).toLocaleDateString("es-ES", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDescargar(reporte.ruta)}
                                                        className="text-blue-600 hover:text-blue-300 hover:bg-blue-500/10"
                                                        title="Descargar"
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
                                                        className="text-red-500 hover:text-red-300 hover:bg-red-500/10"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
