"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";

interface UserUpdateData {
  name?: string;
  email?: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface UserResponse {
  id: number;
  nombre: string;
  email: string;
  codigo_user: string;
  role_id: number;
  rol_nombre: string;
  huella: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserProfileApi() {
  const { GET, PUT, data, loading, error, alert } = useClientApi(true, BACKEND_ROUTES.urlHttpBase);

  /**
   * Obtener perfil del usuario actual
   */
  const getProfile = async () => {
    const response = await GET<UserResponse>(`${BACKEND_ROUTES.urlUsuarios}/me`);
    return response;
  };

  /**
   * Actualizar datos del usuario
   */
  const updateProfile = async (userData: UserUpdateData) => {
    const response = await PUT<UserResponse>(`${BACKEND_ROUTES.urlUsuarios}/profile`, userData);
    return response;
  };

  /**
   * Cambiar contraseña
   */
  const changePassword = async (passwordData: ChangePasswordData) => {
    // Usar FormData para enviar datos como form-urlencoded
    const formData = new FormData();
    formData.append("current_password", passwordData.current_password);
    formData.append("new_password", passwordData.new_password);
    formData.append("confirm_password", passwordData.confirm_password);

    const response = await PUT(`${BACKEND_ROUTES.urlUsuarios}/change-password`, formData, { contentType: "form-data" });
    return response;
  };

  return {
    getProfile,
    updateProfile,
    changePassword,
    state: { data, loading, error, alert },
  };
}
