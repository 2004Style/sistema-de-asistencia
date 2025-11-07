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
import { Loader2, CheckCircle, AlertCircle, LogOut } from "lucide-react";

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
            const user = response.data as any;
            setNombre(user.nombre || session?.user?.name || "");
            setEmail(user.email || session?.user?.email || "");
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
        <div className="container max-w-2xl mx-auto py-6 px-4 md:py-10">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground mt-2">
                    Gestiona tu información personal y seguridad
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="mb-6 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="password">Contraseña</TabsTrigger>
                    <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
                </TabsList>

                {/* Información Personal */}
                <TabsContent value="info" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                            <CardDescription>
                                Actualiza tu nombre y email
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateInfo} className="space-y-6">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre Completo</Label>
                                    <Input
                                        id="nombre"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        disabled={updating}
                                        placeholder="Tu nombre"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={updating}
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                {/* Botón */}
                                <Button
                                    type="submit"
                                    disabled={updating || state.loading}
                                    className="w-full"
                                >
                                    {(updating || state.loading) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Guardar Cambios
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cambiar Contraseña */}
                <TabsContent value="password" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cambiar Contraseña</CardTitle>
                            <CardDescription>
                                Actualiza tu contraseña para mantener tu cuenta segura
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-6">
                                {/* Contraseña Actual */}
                                <div className="space-y-2">
                                    <Label htmlFor="current">Contraseña Actual</Label>
                                    <Input
                                        id="current"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        disabled={updating}
                                        placeholder="Tu contraseña actual"
                                    />
                                </div>

                                {/* Nueva Contraseña */}
                                <div className="space-y-2">
                                    <Label htmlFor="new">Nueva Contraseña</Label>
                                    <Input
                                        id="new"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={updating}
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Usa mayúsculas, minúsculas, números y símbolos para mayor seguridad
                                    </p>
                                </div>

                                {/* Confirmar Contraseña */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirmar Nueva Contraseña</Label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={updating}
                                        placeholder="Repite tu nueva contraseña"
                                    />
                                </div>

                                {/* Botón */}
                                <Button
                                    type="submit"
                                    disabled={updating || state.loading}
                                    className="w-full"
                                >
                                    {(updating || state.loading) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Cambiar Contraseña
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cuenta */}
                <TabsContent value="cuenta" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de Cuenta</CardTitle>
                            <CardDescription>
                                Detalles sobre tu cuenta en el sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Nombre de Usuario</p>
                                    <p className="font-semibold mt-1">{session?.user?.name}</p>
                                </div>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-semibold mt-1">{session?.user?.email}</p>
                                </div>
                            </div>

                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-2">Sesión Activa</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                                        <span className="text-sm font-medium">Conectado</span>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Cerrar Sesión
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    Nota: Tu rol no se puede cambiar desde esta pantalla. Contacta a un administrador si necesitas cambios en tus permisos.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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