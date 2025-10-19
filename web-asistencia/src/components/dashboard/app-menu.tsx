"use client"

import {
    Clock,
    Frame,
    LifeBuoy,
    ScanSearch,
    Send,
    SquareTerminal,
} from "lucide-react"

import { SubMenu } from "./sub-menu"
import { SubMenuProjects } from "./sub-menu-projects"
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

const data = {
    navMain: [
        {
            title: "Adminitrador",
            url: "#",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "Usuarios",
                    url: CLIENT_ROUTES.urlUsers,
                },
                {
                    title: "Asistencias",
                    url: CLIENT_ROUTES.urlAsistencias,
                },
                {
                    title: "Reportes",
                    url: CLIENT_ROUTES.urlReportes,
                },
                {
                    title: "Justificaciones",
                    url: CLIENT_ROUTES.urlJustificaciones,
                },
                {
                    title: "Horarios",
                    url: CLIENT_ROUTES.urlHorarios,
                },
                {
                    title: "Roles",
                    url: CLIENT_ROUTES.urlRoles,
                },
            ],
        },
        {
            title: "temporary pages",
            url: "#",
            icon: Clock,
            items: [
                {
                    title: "Test",
                    url: "/test",
                },
                {
                    title: "Hola",
                    url: "/test/hola",
                }
            ],
        },
    ],
    projects: [
        {
            name: "Design Engineering",
            url: "#",
            icon: Frame,
        }
    ],
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

export function AppMenu({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar
            className="top-8 h-[calc(100svh-2rem)]"
            {...props}
        >
            <SidebarHeader>
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
            <SidebarContent>
                <SubMenu items={data.navMain} />
                <SubMenuProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarFooter>
        </Sidebar>
    )
}