import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

const schema = z.object({
  email: z.email("el correo debe ser válido").min(1, "El correo es obligatorio"),
  password: z.string().min(4, "La contraseña debe tener al menos 8 caracteres"),
});

export default function useLoginForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const loading = form.formState.isSubmitting;

  const onSubmit = async (data: z.infer<typeof schema>) => {

    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: "/",
    });

    if (result?.error) {
      toast.error("Credenciales incorrectas");
    } else if (result?.ok) {
      window.location.href = result.url ?? "/";
    }
  };

  return { form, onSubmit, loading };
}
