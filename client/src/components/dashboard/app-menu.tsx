"use client"

import {
    Frame,
    LifeBuoy,
    ScanSearch,
    Send,
    ShieldUser,
    User,
    View,
} from "lucide-react"

import { SubMenu } from "./sub-menu"
import { NavSecondary } from "./nav-secondary"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CLIENT_ROUTES } from "@/routes/client.routes"
import { useSession } from "next-auth/react"
import { Thememode } from "./theme-mode"
import { url } from "inspector"

const data = {
    navSecondary: [
        {
            title: "Support",
            url: "#",
            icon: LifeBuoy,
        },
        {
            title: "Feedback",
            url: "#",
            icon: Send,
        },
    ],
}

const clientRoutes = {
    title: "Client",
    url: "#",
    icon: User,
    isActive: false,
    items: [
        {
            title: "Dashboard",
            url: CLIENT_ROUTES.urlDashboardClient,
        },
        {
            title: "Asistencias",
            url: CLIENT_ROUTES.urlUserAsistencias,
        },
        {
            title: "Horarios",
            url: CLIENT_ROUTES.urlUserHorarios,
        },
        {
            title: "Justificaciones",
            url: CLIENT_ROUTES.urlUserJustificaciones,
        }
    ],
}

const publicRoutes = {
    title: "Public",
    url: "#",
    icon: View,
    isActive: false,
    items: [
        {
            title: "testing",
            url: CLIENT_ROUTES.urlDashboardClient,
        },
    ],
}

const adminRoutes = {
    title: "Adminitrador",
    url: "#",
    icon: ShieldUser,
    isActive: false,
    items: [
        {
            title: "Dashboard",
            url: CLIENT_ROUTES.urlDashboardAdmin,
        },
        {
            title: "Asistencias",
            url: CLIENT_ROUTES.urlAsistencias,
        },
        {
            title: "Horarios",
            url: CLIENT_ROUTES.urlHorarios,
        },
        {
            title: "Justificaciones",
            url: CLIENT_ROUTES.urlJustificaciones,
        },
        {
            title: "Notificaciones",
            url: CLIENT_ROUTES.urlNotificaciones,
        },
        {
            title: "Reportes",
            url: CLIENT_ROUTES.urlReportes,
        },
        {
            title: "Roles",
            url: CLIENT_ROUTES.urlRoles,
        },
        {
            title: "Turnos",
            url: CLIENT_ROUTES.urlTurnos
        },
        {
            title: "Usuarios",
            url: CLIENT_ROUTES.urlUsers,
        },
    ],
};


export function AppMenu({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: session } = useSession();

    // Determinar rutas basado en autenticación y rol
    const navItems = (() => {
        if (!session?.user) {
            // Si no está autenticado, mostrar solo rutas públicas
            return [publicRoutes];
        }

        if ((session.user as Record<string, unknown>).isAdmin) {
            // Si es admin, mostrar admin, client Y public
            return [adminRoutes, clientRoutes, publicRoutes];
        }

        // Si es client, mostrar client Y public
        return [clientRoutes, publicRoutes];
    })();

    return (
        <Sidebar
            className="top-8 h-[calc(100svh-2rem)] bg-sidebar-primary"
            {...props}
        >
            <SidebarHeader className="bg-sidebar-primary">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <ScanSearch className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">CoreAi</span>
                                    <span className="truncate text-xs">Ai Recognize</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="bg-sidebar-primary">
                <SubMenu items={navItems} />
                <Thememode />
            </SidebarContent>
            <SidebarFooter className="bg-secondary  text-secondary-foreground">
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarFooter>
        </Sidebar>
    )
}