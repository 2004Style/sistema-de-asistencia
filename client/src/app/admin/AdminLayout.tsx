"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Layout protegido para la ruta /admin
 * - No renderiza nada mientras se valida la sesión
 * - Redirige a /auth si no está autenticado
 * - Redirige a /client si es usuario regular
 * - Solo muestra contenido a administradores
 */
export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        // Estado de carga - no mostrar nada mientras se valida
        if (status === "loading") {
            setIsAuthorized(null);
            return;
        }

        // No autenticado - redirigir a login
        if (status === "unauthenticated") {
            router.replace("/auth");
            setIsAuthorized(false);
            return;
        }

        // Verificar que existe usuario
        if (!session?.user) {
            router.replace("/auth");
            setIsAuthorized(false);
            return;
        }

        // Autenticado pero no es admin - redirigir a cliente
        if (!session.user.isAdmin) {
            router.replace("/client");
            setIsAuthorized(false);
            return;
        }

        // Es admin - permitir acceso
        setIsAuthorized(true);
    }, [status, session, router]);

    // Mientras se valida, no mostrar nada
    if (isAuthorized === null) {
        return null;
    }

    // Si está autorizado, mostrar contenido
    if (isAuthorized) {
        return <div className="p-4 md:py-10">{children}</div>;
    }

    // No autorizado - no renderizar nada (ya fue redirigido)
    return null;
}
