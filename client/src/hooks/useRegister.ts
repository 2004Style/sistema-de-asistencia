import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";
import { toast } from "sonner";

export const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    codigo_user: z.string().min(3, "El código es requerido").max(3, "El código debe tener exactamente 3 caracteres"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  type: "frontal" | "perfil";
  timestamp: number;
}

interface UseRegisterReturn {
  codigo_user: string;
  created_at: string;
  email: string;
  huella: null;
  id: number;
  is_active: boolean;
  name: string;
  updated_at: null;
}

export function useRegister() {
  const { POST, DELETE } = useClientApi(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      codigo_user: "",
      password: "",
      confirm_password: "",
    },
  });

  const addCapturedPhoto = (photo: CapturedPhoto) => {
    setCapturedPhotos((prev) => {
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, photo];
    });
  };

  const removeCapturedPhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const clearCapturedPhotos = () => {
    setCapturedPhotos([]);
  };

  const onSubmit = async (data: RegisterFormData): Promise<UseRegisterReturn | null> => {
    // Validar que se hayan tomado las 10 fotos
    if (capturedPhotos.length < 10) {
      return null;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Agregar datos del formulario
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("codigo_user", data.codigo_user);
      formData.append("password", data.password);
      formData.append("confirm_password", data.confirm_password);

      // Agregar las 10 fotos de reconocimiento facial
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        const blob = await fetch(photo.dataUrl).then((r) => r.blob());
        // enviar como PNG para mantener calidad (dataUrl ahora es image/png)
        formData.append("images", blob, `image${i + 1}.png`);
      }

      const response = await POST<UseRegisterReturn>(BACKEND_ROUTES.urlUsersRegister, formData, { contentType: "form-data" });

      if (response.alert === "error") {
        toast.error(response.message || "Error al registrar usuario", { position: "top-center" });
        return null;
      }

      // NO limpiar formulario ni fotos aquí, dejar que el componente lo haga
      toast.success(response.message || "Usuario registrado exitosamente", { position: "bottom-right" });

      return response.data || null;
    } catch {
      toast.error("Error al registrar usuario", { position: "top-center" });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id: number) => {
    const { alert, message } = await DELETE(`${BACKEND_ROUTES.urlUsuarios}/${id}`);
    if (alert === "error") {
      toast.error(message || "Error al eliminar usuario", { position: "top-center" });
      return false;
    }
    toast.success(message || "Usuario eliminado exitosamente", { position: "bottom-right" });
    return true;
  };

  return {
    form,
    capturedPhotos,
    isSubmitting,
    addCapturedPhoto,
    removeCapturedPhoto,
    clearCapturedPhotos,
    handleSubmit: onSubmit,
    onSubmit: form.handleSubmit(onSubmit),
    onDelete,
  };
}
