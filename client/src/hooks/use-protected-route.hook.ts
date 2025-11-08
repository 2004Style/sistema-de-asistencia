"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hook personalizado para protección de rutas
 * Reutilizable en múltiples componentes
 */
export function useProtectedRoute(requiredRole?: "admin" | "user") {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      // No actualizar estado mientras está cargando
      return;
    }

    if (status === "unauthenticated") {
      setRedirecting(true);
      router.replace("/auth");
      return;
    }

    if (!session?.user) {
      setRedirecting(true);
      router.replace("/auth");
      return;
    }

    const isAdmin = session.user.isAdmin === true;

    // Validar rol requerido
    if (requiredRole === "admin" && !isAdmin) {
      setRedirecting(true);
      router.replace("/");
      return;
    }

    // Para requiredRole === "user", los admins también pueden acceder
    // Así que no bloqueamos a los admins aquí

    setIsAuthorized(true);
  }, [status, session, router, requiredRole]);

  return {
    isAuthorized,
    isLoading: status === "loading",
    redirecting,
    session,
    isAdmin: session?.user?.isAdmin === true,
    canRender: isAuthorized === true,
  };
}
