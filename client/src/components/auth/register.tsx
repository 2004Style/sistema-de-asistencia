'use client';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRegister } from "@/hooks/useRegister"
import { WebcamCapture } from "./WebcamCapture"
import { Loader2, UserPlus } from "lucide-react"
import { HuellaVerificationModal } from "../huella/HuellaVerificationModal";
import { useState } from "react";
import { CLIENT_ROUTES } from "@/routes/client.routes";

export function SignupForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const {
        form,
        capturedPhotos,
        isSubmitting,
        addCapturedPhoto,
        removeCapturedPhoto,
        clearCapturedPhotos,
        handleSubmit: submitRegister,
    } = useRegister();

    const {
        register,
        formState: { errors },
    } = form;

    const [huellaRegister, setHuellaRegister] = useState<boolean>(false);
    const [registeredUser, setRegisteredUser] = useState<{
        codigo_user: string;
        created_at: string;
        email: string;
        huella: null;
        id: number;
        is_active: boolean;
        name: string;
        updated_at: null;
    } | null>(null);

    // Manejar éxito de la huella
    const handleHuellaSuccess = (_data: unknown) => {
        // Limpiar formulario después del éxito
        form.reset();
        clearCapturedPhotos();
        // Aquí puedes redirigir a login o mostrar un mensaje de éxito
        // setTimeout(() => {
        //     window.location.href = "/auth";
        // }, 2000);
    };

    // Usar el onSubmit del hook pero con lógica adicional
    const handleFormSubmit = form.handleSubmit(async (data) => {
        const result = await submitRegister(data);
        console.log("resultado registro:", result);
        if (result) {
            // Usuario registrado exitosamente, mostrar modal de huella
            console.log("resultado registro:", result);
            setRegisteredUser(result);
            setHuellaRegister(true);
        }
    });

    return (
        <>
            <form
                className={cn("flex flex-col gap-6", className)}
                onSubmit={handleFormSubmit}
                {...props}
            >
                <FieldGroup>
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h1 className="text-2xl font-bold">Crear tu cuenta</h1>
                        <p className="text-muted-foreground text-sm text-balance">
                            Completa todos los campos para registrarte en el sistema
                        </p>
                    </div>

                    {/* Nombre */}
                    <Field>
                        <FieldLabel htmlFor="name">Nombre Completo</FieldLabel>
                        <Input
                            id="name"
                            type="text"
                            placeholder="nombre"
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                        )}
                    </Field>

                    {/* Email */}
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            {...register('email')}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                        )}
                    </Field>

                    {/* Código de Usuario */}
                    <Field>
                        <FieldLabel htmlFor="codigo_user">Código de Usuario</FieldLabel>
                        <Input
                            id="codigo_user"
                            type="text"
                            placeholder="abc"
                            {...register('codigo_user')}
                        />
                        <FieldDescription>
                            Código único de identificación debe ser de 3 digitos
                        </FieldDescription>
                        {errors.codigo_user && (
                            <p className="text-sm text-red-500 mt-1">{errors.codigo_user.message}</p>
                        )}
                    </Field>

                    {/* Password */}
                    <Field>
                        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            placeholder="password"
                            {...register('password')}
                        />
                        <FieldDescription>
                            Debe tener al menos 8 caracteres
                        </FieldDescription>
                        {errors.password && (
                            <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                        )}
                    </Field>

                    {/* Confirmar Password */}
                    <Field>
                        <FieldLabel htmlFor="confirm_password">Confirmar Contraseña</FieldLabel>
                        <Input
                            id="confirm_password"
                            type="password"
                            placeholder="password"
                            {...register('confirm_password')}
                        />
                        {errors.confirm_password && (
                            <p className="text-sm text-red-500 mt-1">{errors.confirm_password.message}</p>
                        )}
                    </Field>

                    {/* Captura Facial */}
                    <Field>
                        <FieldLabel>Captura Facial para Reconocimiento</FieldLabel>
                        <FieldDescription className="mb-4">
                            Se requieren 10 fotos de tu rostro (frontales y de perfil) para el sistema de reconocimiento facial
                        </FieldDescription>
                        <WebcamCapture
                            onCapture={addCapturedPhoto}
                            onRemove={removeCapturedPhoto}
                            capturedPhotos={capturedPhotos}
                            maxPhotos={10}
                        />
                    </Field>

                    {/* Botón de Submit */}
                    <Field>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting || capturedPhotos.length < 10}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Crear Cuenta
                                </>
                            )}
                        </Button>
                        {capturedPhotos.length < 10 && (
                            <FieldDescription className="text-center text-amber-600 dark:text-amber-400">
                                ⚠️ Faltan {10 - capturedPhotos.length} fotos de reconocimiento facial
                            </FieldDescription>
                        )}
                    </Field>

                    <Field>
                        <FieldDescription className="px-6 text-center">
                            ¿Ya tienes una cuenta? <a href="/auth" className="text-primary hover:underline">Iniciar sesión</a>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>

            <HuellaVerificationModal
                open={huellaRegister}
                onOpenChange={(open) => {
                    if (!open) setHuellaRegister(false);
                }}
                tipo="registro"
                codigo={registeredUser?.codigo_user || ""}
                userId={registeredUser?.id || 0}
                onSuccess={handleHuellaSuccess}
                showInternalSuccessModal={true}
                AuthRedirect={`${CLIENT_ROUTES.urlRegister}/${registeredUser?.id}`}
            />

        </>

    )
}
