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
    const { form, onSubmit } = useLoginForm();

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Login to your account</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Enter your email below to login to your account
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                    )}
                </Field>
                <Field>
                    <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <a
                            href="#"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                            Forgot your password?
                        </a>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        required
                        {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                        <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                    )}
                </Field>
                <Field>
                    <Button type="submit" disabled={!form.formState.isValid}>Login</Button>
                </Field>
                <Field>
                    <FieldDescription className="text-center">
                        Don&apos;t have an account?{" "}
                        <a href="/auth/register" className="underline underline-offset-4">
                            Sign up
                        </a>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    )
}
