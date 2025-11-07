"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRolesApi } from "@/hooks/useRolesApi.hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreateRolPage() {
    const router = useRouter();
    const { create, state } = useRolesApi();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        es_admin: false,
        puede_aprobar: false,
        puede_ver_reportes: false,
        puede_gestionar_usuarios: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckChange = (field: string, checked: boolean) => {
        setFormData((prev) => ({ ...prev, [field]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validaciones
        if (!formData.nombre.trim()) {
            setError("El nombre del rol es requerido");
            setLoading(false);
            return;
        }

        if (!formData.descripcion.trim()) {
            setError("La descripción del rol es requerida");
            setLoading(false);
            return;
        }

        const response = await create(formData);

        if (response.alert === "success") {
            setSuccess(true);
            setTimeout(() => {
                router.push("/admin/roles");
            }, 1500);
        } else {
            setError(response.message || "Error al crear el rol");
        }

        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Rol</h1>
                <p className="text-muted-foreground mt-2">
                    Configura un nuevo rol con permisos personalizados
                </p>
            </div>

            {/* Success Alert */}
            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Rol creado exitosamente. Redirigiendo...
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del Rol</CardTitle>
                    <CardDescription>
                        Completa los detalles del nuevo rol
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del Rol *</Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                placeholder="Ej: Supervisor de Asistencia"
                                value={formData.nombre}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción *</Label>
                            <Textarea
                                id="descripcion"
                                name="descripcion"
                                placeholder="Describe las responsabilidades de este rol"
                                value={formData.descripcion}
                                onChange={handleChange}
                                disabled={loading}
                                rows={4}
                            />
                        </div>

                        {/* Permisos */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Permisos</h3>

                            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                                {/* Admin */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="es_admin"
                                        checked={formData.es_admin}
                                        onCheckedChange={(checked) => handleCheckChange("es_admin", checked as boolean)}
                                        disabled={loading}
                                    />
                                    <Label htmlFor="es_admin" className="cursor-pointer">
                                        <div>
                                            <p className="font-medium">Administrador</p>
                                            <p className="text-xs text-muted-foreground">
                                                Acceso total al sistema
                                            </p>
                                        </div>
                                    </Label>
                                </div>

                                {/* Puede Aprobar */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="puede_aprobar"
                                        checked={formData.puede_aprobar}
                                        onCheckedChange={(checked) => handleCheckChange("puede_aprobar", checked as boolean)}
                                        disabled={loading}
                                    />
                                    <Label htmlFor="puede_aprobar" className="cursor-pointer">
                                        <div>
                                            <p className="font-medium">Puede Aprobar Justificaciones</p>
                                            <p className="text-xs text-muted-foreground">
                                                Permiso para revisar y aprobar justificaciones
                                            </p>
                                        </div>
                                    </Label>
                                </div>

                                {/* Ver Reportes */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="puede_ver_reportes"
                                        checked={formData.puede_ver_reportes}
                                        onCheckedChange={(checked) => handleCheckChange("puede_ver_reportes", checked as boolean)}
                                        disabled={loading}
                                    />
                                    <Label htmlFor="puede_ver_reportes" className="cursor-pointer">
                                        <div>
                                            <p className="font-medium">Puede Ver Reportes</p>
                                            <p className="text-xs text-muted-foreground">
                                                Acceso a reportes y estadísticas
                                            </p>
                                        </div>
                                    </Label>
                                </div>

                                {/* Gestionar Usuarios */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="puede_gestionar_usuarios"
                                        checked={formData.puede_gestionar_usuarios}
                                        onCheckedChange={(checked) => handleCheckChange("puede_gestionar_usuarios", checked as boolean)}
                                        disabled={loading}
                                    />
                                    <Label htmlFor="puede_gestionar_usuarios" className="cursor-pointer">
                                        <div>
                                            <p className="font-medium">Puede Gestionar Usuarios</p>
                                            <p className="text-xs text-muted-foreground">
                                                Permiso para crear, editar y eliminar usuarios
                                            </p>
                                        </div>
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-6">
                            <Button
                                type="submit"
                                disabled={loading || state.loading}
                            >
                                {(loading || state.loading) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Crear Rol
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
