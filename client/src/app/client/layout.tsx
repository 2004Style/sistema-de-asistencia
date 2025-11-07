import type { Metadata } from "next";
import ClientLayoutClient from "./ClientLayout";

export const metadata: Metadata = {
    title: "Cliente - Sistema de Asistencia",
    description: "Panel del cliente del sistema de asistencia",
};

export default function ClientLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <ClientLayoutClient>{children}</ClientLayoutClient>;
}
