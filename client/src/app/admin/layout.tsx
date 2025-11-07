import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayout";

export const metadata: Metadata = {
    title: "Admin - Sistema de Asistencia",
    description: "Panel de administración del sistema de asistencia",
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
