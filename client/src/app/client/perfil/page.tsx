"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useUserProfileApi } from "@/hooks/useUserProfileApi.hook";
import { RouteProtector } from "@/components/auth/RouteProtector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, LogOut, User, Lock, Shield, Mail, Calendar, Badge } from "lucide-react";

function ProfilePageContent() {
    const router = useRouter();
    const { data: session } = useSession();
    const { getProfile, updateProfile, changePassword, state } = useUserProfileApi();

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("info");

    // Form state - Información
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");

    // Form state - Cambiar contraseña
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        cargarPerfil();
    }, []);

    const cargarPerfil = async () => {
        setLoading(true);
        setError(null);

        const response = await getProfile();

        if (response.alert === "success" && response.data) {
            const user = response.data as unknown as Record<string, unknown>;
            setNombre((user.nombre as string) || session?.user?.name || "");
            setEmail((user.email as string) || session?.user?.email || "");
        } else {
            setError("Error al cargar el perfil");
        }

        setLoading(false);
    };

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setError(null);
        setSuccess(null);

        if (!nombre.trim()) {
            setError("El nombre es requerido");
            setUpdating(false);
            return;
        }

        if (!email.trim()) {
            setError("El email es requerido");
            setUpdating(false);
            return;
        }

        const response = await updateProfile({
            name: nombre,
            email: email,
        });

        if (response.alert === "success") {
            setSuccess("Información actualizada correctamente");
        } else {
            setError(response.message || "Error al actualizar la información");
        }

        setUpdating(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setError(null);
        setSuccess(null);

        // Validaciones
        if (!currentPassword) {
            setError("La contraseña actual es requerida");
            setUpdating(false);
            return;
        }

        if (!newPassword) {
            setError("La nueva contraseña es requerida");
            setUpdating(false);
            return;
        }

        if (newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            setUpdating(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            setUpdating(false);
            return;
        }

        const response = await changePassword({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
        });

        if (response.alert === "success") {
            setSuccess("Contraseña actualizada correctamente");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } else {
            setError(response.message || "Error al cambiar la contraseña");
        }

        setUpdating(false);
    };

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: "/auth" });
    };

    if (loading || state.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6 px-4 md:py-10">
            <div className="container max-w-4xl mx-auto">
                {/* Header Premium */}
                <div className="mb-8">
                    <div className="relative">
                        {/* Background Banner */}
                        <div className="relative">
                            <div className="flex items-start justify-between gap-6">
                                {/* Avatar y Info */}
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                                        <User className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold ">
                                            {nombre || session?.user?.name || "Mi Perfil"}
                                        </h1>
                                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {email || session?.user?.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="bg-secondary rounded-xl p-4 shadow-sm border border-secondary">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-secondary-foreground">Cuenta Activa</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Conectado ahora</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="destructive" className="mb-6 shadow-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-6 border-green-200 bg-green-50 shadow-md">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8 bg-secondary text-secondary-foreground shadow-sm border-none">
                        <TabsTrigger value="info" className="flex items-center gap-2 text-secondary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground  dark:text-secondary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">Información</span>
                        </TabsTrigger>
                        <TabsTrigger value="password" className="flex items-center gap-2 text-secondary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground  dark:text-secondary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
                            <Lock className="h-4 w-4" />
                            <span className="hidden sm:inline">Contraseña</span>
                        </TabsTrigger>
                        <TabsTrigger value="cuenta" className="flex items-center gap-2 text-secondary-foreground data-[state=active]:bg-primary  data-[state=active]:text-primary-foreground  dark:text-secondary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
                            <Shield className="h-4 w-4" />
                            <span className="hidden sm:inline">Cuenta</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Información Personal */}
                    <TabsContent value="info" className="mt-0">
                        <Card className="shadow-lg border-0 bg-primary text-primary-foreground">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-purple-600" />
                                    Información Personal
                                </CardTitle>
                                <CardDescription className="text-primary-foreground/60">
                                    Actualiza tu nombre y email asociado a tu cuenta
                                </CardDescription>
                            </CardHeader>
                            <CardContent >
                                <form onSubmit={handleUpdateInfo} className="space-y-6">
                                    {/* Nombre */}
                                    <div className="space-y-3">
                                        <Label htmlFor="nombre" className="text-sm font-semibold">Nombre Completo</Label>
                                        <Input
                                            id="nombre"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                            disabled={updating || state.loading}
                                            placeholder="Ingresa tu nombre completo"
                                            className="h-11 border-slate-200 focus:border-purple-500"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={updating || state.loading}
                                            placeholder="tu@email.com"
                                            className="h-11 border-slate-200 focus:border-purple-500"
                                        />
                                    </div>

                                    {/* Botón */}
                                    <Button
                                        type="submit"
                                        disabled={updating || state.loading}
                                        className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-600 hover:from-purple-700 hover:to-purple-700 text-white font-semibold rounded-lg"
                                    >
                                        {(updating || state.loading) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {updating ? "Guardando..." : "Guardar Cambios"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cambiar Contraseña */}
                    <TabsContent value="password" className="mt-0">
                        <Card className="shadow-lg border-0 bg-primary text-primary-foreground">
                            <CardHeader >
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-purple-600" />
                                    Cambiar Contraseña
                                </CardTitle>
                                <CardDescription className="text-primary-foreground/60">
                                    Mantén tu cuenta segura actualizando tu contraseña regularmente
                                </CardDescription>
                            </CardHeader>
                            <CardContent >
                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    {/* Contraseña Actual */}
                                    <div className="space-y-3">
                                        <Label htmlFor="current" className="text-sm font-semibold">Contraseña Actual</Label>
                                        <Input
                                            id="current"
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            disabled={updating || state.loading}
                                            placeholder="Ingresa tu contraseña actual"
                                            className="h-11 border-slate-200 focus:border-purple-500"
                                        />
                                    </div>

                                    {/* Nueva Contraseña */}
                                    <div className="space-y-3">
                                        <Label htmlFor="new" className="text-sm font-semibold">Nueva Contraseña</Label>
                                        <Input
                                            id="new"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            disabled={updating || state.loading}
                                            placeholder="Mínimo 8 caracteres"
                                            className="h-11 border-slate-200 focus:border-purple-500"
                                        />
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                                            <p className="text-xs text-purple-900 font-semibold mb-2">Requisitos de seguridad:</p>
                                            <ul className="text-xs text-purple-800 space-y-1">
                                                <li>✓ Mínimo 8 caracteres</li>
                                                <li>✓ Mayúsculas y minúsculas</li>
                                                <li>✓ Números y símbolos</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Confirmar Contraseña */}
                                    <div className="space-y-3">
                                        <Label htmlFor="confirm" className="text-sm font-semibold">Confirmar Nueva Contraseña</Label>
                                        <Input
                                            id="confirm"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={updating || state.loading}
                                            placeholder="Repite tu nueva contraseña"
                                            className="h-11 border-slate-200 focus:border-purple-500"
                                        />
                                    </div>

                                    {/* Botón */}
                                    <Button
                                        type="submit"
                                        disabled={updating || state.loading}
                                        className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-600 hover:from-purple-700 hover:to-purple-700 text-white font-semibold rounded-lg"
                                    >
                                        {(updating || state.loading) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {updating ? "Cambiando..." : "Cambiar Contraseña"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cuenta */}
                    <TabsContent value="cuenta" className="mt-0">
                        <div className="space-y-6">
                            {/* Información General */}
                            <Card className="shadow-lg border-0 bg-primary text-primary-foreground">
                                <CardHeader >
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-green-600" />
                                        Información de Cuenta
                                    </CardTitle>
                                    <CardDescription className="text-primary-foreground/60">
                                        Detalles sobre tu cuenta en el sistema
                                    </CardDescription>
                                </CardHeader>
                                <CardContent >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Usuario */}
                                        <div className="bg-secondary p-5 rounded-xl ">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="h-4 w-4 text-secondary-foreground" />
                                                <p className="text-sm text-secondary-foreground font-medium">Usuario</p>
                                            </div>
                                            <p className="font-semibold text-lg text-secondary-foreground truncate">
                                                {session?.user?.name || "No definido"}
                                            </p>
                                        </div>

                                        {/* Email */}
                                        <div className="bg-secondary p-5 rounded-xl ">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Mail className="h-4 w-4 text-secondary-foreground" />
                                                <p className="text-sm text-secondary-foreground font-medium">Email</p>
                                            </div>
                                            <p className="font-semibold text-lg text-secondary-foreground truncate">
                                                {session?.user?.email || "No definido"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sesión */}
                            <Card className="shadow-lg border-0 bg-primary text-primary-foreground">
                                <CardHeader >
                                    <CardTitle className="flex items-center gap-2">
                                        <Badge className="h-5 w-5 text-purple-600" />
                                        Estado de Sesión
                                    </CardTitle>
                                </CardHeader>
                                <CardContent >
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-75" />
                                                    <div className="relative h-3 w-3 bg-green-500 rounded-full" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-green-900">Conectado</span>
                                                    <p className="text-xs text-green-700">Tu sesión está activa y segura</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="lg"
                                                onClick={handleLogout}
                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Cerrar Sesión
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-xs text-amber-900 font-semibold mb-2">⚠️ Nota Importante</p>
                                        <p className="text-xs text-amber-800">
                                            Tu rol y permisos no se pueden cambiar desde esta pantalla. Si necesitas cambios en tus permisos o rol, contacta con un administrador del sistema.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Acciones Rápidas */}
                            <Card className="shadow-lg border-0 bg-primary text-primary-foreground">
                                <CardHeader >
                                    <CardTitle>Acciones Rápidas</CardTitle>
                                </CardHeader>
                                <CardContent >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-lg border-none bg-purple-500 text-white hover:bg-purple-700 hover:text-white dark:bg-purple-500 dark:text-white dark:hover:bg-purple-700 dark:hover:text-white"
                                            onClick={() => router.replace("/client/asistencias")}
                                        >
                                            Mis Asistencias
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-lg border-none bg-purple-500 text-white hover:bg-purple-700 hover:text-white dark:bg-purple-500 dark:text-white dark:hover:bg-purple-700 dark:hover:text-white"
                                            onClick={() => router.replace("/client/horarios")}
                                        >
                                            Mis Horarios
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-lg border-none bg-purple-500 text-white hover:bg-purple-700 hover:text-white dark:bg-purple-500 dark:text-white dark:hover:bg-purple-700 dark:hover:text-white"
                                            onClick={() => router.replace("/client/justificaciones")}
                                        >
                                            Mis Justificaciones
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-lg border-none bg-purple-500 text-white hover:bg-purple-700 hover:text-white dark:bg-purple-500 dark:text-white dark:hover:bg-purple-700 dark:hover:text-white"
                                            onClick={() => router.replace("/client")}
                                        >
                                            Volver al Inicio
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <RouteProtector requiredRole="user">
            <ProfilePageContent />
        </RouteProtector>
    );
}