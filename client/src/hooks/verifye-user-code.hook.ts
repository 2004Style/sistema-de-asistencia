"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "./useClientApi.hook";

export interface VerifyUserCodeData {
  codigo_user: string;
}

export interface ResponseVerifyUserCode {
  id: number;
  name: string;
  codigo_user: string;
  huella: string | null;
}

export function useVerifyUserCode() {
  const { GET } = useClientApi(false);

  const verifyUserCode = async (body: VerifyUserCodeData) => {
    const { data } = await GET<ResponseVerifyUserCode>(`${BACKEND_ROUTES.urlVerifyCode}/${body.codigo_user}`);
    return { user: data };
  };
  return { verifyUserCode };
}
