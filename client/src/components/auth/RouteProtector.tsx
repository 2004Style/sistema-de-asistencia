"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface RouteProtectorProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "user" | "any";
    fallback?: React.ReactNode;
}

/**
 * Componente para proteger rutas del lado del cliente
 * - No renderiza nada mientras se valida la sesión
 * - Redirige a /auth si no está autenticado
 * - Redirige a /admin si es admin pero necesita ser usuario
 * - Redirige a / si es usuario pero necesita ser admin
 */
export function RouteProtector({
    children,
    requiredRole = "any",
    fallback = null,
}: RouteProtectorProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        // Estado de carga
        if (status === "loading") {
            setIsAuthorized(null);
            return;
        }

        // No autenticado
        if (status === "unauthenticated") {
            router.replace("/auth");
            setIsAuthorized(false);
            return;
        }

        // Validar que exista el usuario
        if (!session?.user) {
            router.replace("/auth");
            setIsAuthorized(false);
            return;
        }

        const isAdmin = session.user.isAdmin === true;

        // Validar roles requeridos
        if (requiredRole === "admin") {
            if (!isAdmin) {
                router.replace("/");
                setIsAuthorized(false);
                return;
            }
        } else if (requiredRole === "user") {
            // Los admins pueden acceder a rutas de usuario también
            if (!isAdmin && !session.user) {
                router.replace("/auth");
                setIsAuthorized(false);
                return;
            }
        }

        // Autorizado
        setIsAuthorized(true);
    }, [status, session, router, requiredRole]);

    // Mientras se valida, no mostrar nada
    if (isAuthorized === null) {
        return null;
    }

    // Si está autorizado, mostrar contenido
    if (isAuthorized) {
        return <>{children}</>;
    }

    // No autorizado, mostrar fallback
    return <>{fallback}</>;
}
