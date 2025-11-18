import type { Metadata } from "next";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppNav } from "@/components/dashboard/app-nav";
import { AppMenu } from "@/components/dashboard/app-menu";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/contexts/socketContext";
import Providers from "@/contexts/Providers";

export const metadata: Metadata = {
  title: "CS - Sistema de Asistencia",
  description: "Sistema de gestión de asistencias para Administrativos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        cz-shortcut-listen="true"
      >
        <Providers>
          <SocketProvider>
            <Toaster />
            <SidebarProvider className="flex flex-col">
              <AppNav />
              <div className="flex flex-1">
                <AppMenu />
                <SidebarInset>
                  {children}
                </SidebarInset>
              </div>
            </SidebarProvider>
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}
