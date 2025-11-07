"use client"

import { useSession } from "next-auth/react";

export default function ClientPage() {
    const { data: session } = useSession();

    // Si no hay sesión o usuario, no renderizar nada (ClientLayout se encargará)
    if (!session?.user) {
        return null;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold">Bienvenido, {session.user.name || "Usuario"}</h1>
            <p className="text-gray-600">Panel del cliente - Sistema de Asistencia</p>
        </div>
    );
}