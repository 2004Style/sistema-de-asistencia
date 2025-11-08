"use client";

import { useState, useEffect } from "react";
import { useReportesApi } from "@/hooks/useReportesApi.hook";
import { useAsistenciasApi } from "@/hooks/useAsistenciasApi.hook";
import { validatePaginatedResponse, getErrorMessage, ensureArray, validateObject } from "@/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    Users,
    Clock,
    UserCheck,
    AlertCircle,
    TrendingUp,
    RefreshCw,
    Calendar,
} from "lucide-react";

interface EstadisticasData {
    success: boolean;
    data?: any;
    error?: string;
}

interface StatCardProps {
    title: string;
    value: number | string;
    description?: string;
    icon: React.ReactNode;
    color: string;
}

function StatCard({ title, value, description, icon, color }: StatCardProps) {
    return (
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-2">{value}</p>
                        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                    </div>
                    <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { obtenerEstadisticas } = useReportesApi();
    const { list: listAsistencias } = useAsistenciasApi();

    const [estadisticas, setEstadisticas] = useState<EstadisticasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const cargarEstadisticas = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const response = await obtenerEstadisticas();

            if (response?.alert === "success" && response?.data) {
                // Validar estructura de datos
                const dataObj = response.data as any;
                if (dataObj?.resumen && Array.isArray(dataObj.por_rol) && Array.isArray(dataObj.por_turno) && Array.isArray(dataObj.tendencia_diaria)) {
                    setEstadisticas({
                        success: true,
                        data: response.data,
                    });
                } else {
                    throw new Error("Estructura de datos inválida");
                }
            } else {
                setError("No se pudieron obtener las estadísticas");
                setEstadisticas(null);
            }
        } catch (err) {
            const mensaje = getErrorMessage(err);
            setError(mensaje);
            setEstadisticas(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        cargarEstadisticas();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Estadísticas del sistema de asistencia</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border-0 shadow-md">
                            <CardContent className="pt-6">
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Estadísticas del sistema de asistencia</p>
                </div>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>

                <Button onClick={cargarEstadisticas} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Recargando..." : "Reintentar"}
                </Button>
            </div>
        );
    }

    const data = estadisticas?.data;
    if (!data) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Estadísticas del sistema de asistencia</p>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No hay datos disponibles para mostrar</AlertDescription>
                </Alert>
            </div>
        );
    }

    const resumen = data.resumen || {};
    const porRol = ensureArray(data.por_rol);
    const porTurno = ensureArray(data.por_turno);
    const tendenciaDiaria = ensureArray(data.tendencia_diaria);

    // Colores para gráficos
    const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#6366f1"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Estadísticas del {data.periodo?.fecha_inicio} al {data.periodo?.fecha_fin}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={cargarEstadisticas}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Presentes"
                    value={resumen.asistencias_presentes || 0}
                    description={`${resumen.porcentaje_asistencia || 0}% del total`}
                    icon={<UserCheck className="h-6 w-6 text-green-500" />}
                    color="bg-green-50 dark:bg-green-500/10"
                />
                <StatCard
                    title="Ausentes"
                    value={resumen.asistencias_ausentes || 0}
                    description={`de ${resumen.total_asistencias || 0}`}
                    icon={<Users className="h-6 w-6 text-red-500" />}
                    color="bg-red-50 dark:bg-red-500/10"
                />
                <StatCard
                    title="Tardías"
                    value={resumen.asistencias_tardias || 0}
                    description="registradas"
                    icon={<Clock className="h-6 w-6 text-amber-500" />}
                    color="bg-amber-50 dark:bg-amber-500/10"
                />
                <StatCard
                    title="Usuarios Activos"
                    value={resumen.usuarios_con_asistencia || 0}
                    description={`de ${resumen.usuarios_totales || 0}`}
                    icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
                    color="bg-blue-50 dark:bg-blue-500/10"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tendencia Diaria */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Tendencia Diaria
                        </CardTitle>
                        <CardDescription>Asistencias registradas por día</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tendenciaDiaria.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={tendenciaDiaria}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="fecha"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(date) => new Date(date).toLocaleDateString("es", { month: "short", day: "numeric" })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                        }}
                                        formatter={(value) => [value, "Asistencias"]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cantidad"
                                        stroke="#3b82f6"
                                        dot={{ fill: "#3b82f6", r: 4 }}
                                        activeDot={{ r: 6 }}
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No hay datos disponibles
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Asistencias por Rol */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Asistencias por Rol
                        </CardTitle>
                        <CardDescription>Distribución por roles del sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {porRol.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={porRol}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="rol" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                        }}
                                        formatter={(value) => [value, "Cantidad"]}
                                    />
                                    <Bar dataKey="cantidad" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No hay datos disponibles
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asistencias por Turno */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Asistencias por Turno
                        </CardTitle>
                        <CardDescription>Distribución de asistencias por turno</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {porTurno.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={porTurno}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ turno, cantidad }) => `${turno}: ${cantidad}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="cantidad"
                                    >
                                        {porTurno.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                        }}
                                        formatter={(value) => [value, "Cantidad"]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No hay datos disponibles
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Resumen General */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Resumen General
                        </CardTitle>
                        <CardDescription>Indicadores clave del período</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                            <span className="text-sm font-medium">Total Asistencias</span>
                            <Badge variant="outline" className="text-lg">
                                {resumen.total_asistencias || 0}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-500/10">
                            <span className="text-sm font-medium">Porcentaje Asistencia</span>
                            <Badge className="bg-green-600">
                                {(resumen.porcentaje_asistencia || 0).toFixed(1)}%
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/10">
                            <span className="text-sm font-medium">Tasa de Ausencia</span>
                            <Badge variant="destructive">
                                {((resumen.asistencias_ausentes || 0) / (resumen.total_asistencias || 1) * 100).toFixed(1)}%
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                            <span className="text-sm font-medium">Tasa de Tardanza</span>
                            <Badge variant="secondary">
                                {((resumen.asistencias_tardias || 0) / (resumen.total_asistencias || 1) * 100).toFixed(1)}%
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                            <span className="text-sm font-medium">Usuarios Registrados</span>
                            <Badge variant="outline">{resumen.usuarios_totales || 0}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
