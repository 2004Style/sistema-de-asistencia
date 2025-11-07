import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mi Perfil - Sistema de Asistencia",
    description: "Página de perfil del usuario",
};

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
