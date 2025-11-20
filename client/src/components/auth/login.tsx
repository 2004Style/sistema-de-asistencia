import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import useLoginForm from "@/hooks/login.hook"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const { form, onSubmit, loading } = useLoginForm();

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Ingresa a tu cuenta</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Ingresa tus credenciales para acceder a tu cuenta.
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="email">Correo</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        placeholder="user@cs.dev"
                        required
                        {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                    )}
                </Field>
                <Field>
                    <div className="flex items-center">
                        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                        <a
                            href="#"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                            Haz olvidado tu contraseña?
                        </a>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="contraseña"
                        required
                        {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                        <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                    )}
                </Field>
                <Field>
                    <Button type="submit" disabled={!form.formState.isValid}>{loading ? 'Iniciando sesión...' : 'Login'}</Button>
                </Field>
                <Field>
                    <FieldDescription className="text-center">
                        Aun no tienes una cuenta?{" "}
                        <a href="/auth/register" className="underline underline-offset-4">
                            Regístrate
                        </a>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    )
}
