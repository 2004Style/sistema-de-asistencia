"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientLayout({
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
            return;
        }

        // Autenticado - verificar que sea un usuario válido
        if (session?.user) {
            // Admin O Usuario regular - AMBOS tienen acceso a /client
            setIsAuthorized(true);
            return;
        }

        // No hay usuario en la sesión - redirigir a login
        router.replace("/auth");
        setIsAuthorized(false);
    }, [status, session, router]);

    // Mientras se valida, no mostrar nada
    if (isAuthorized === null) {
        return null;
    }

    // Si está autorizado, mostrar contenido
    if (isAuthorized) {
        return <>{children}</>;
    }

    // Fallback (no debería llegar aquí por las redirecciones)
    return null;
}
