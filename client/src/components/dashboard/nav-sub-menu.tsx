"use client"

import {
    ArrowDown,
    ArrowUp,
    Copy,
    CornerUpLeft,
    FileText,
    LineChart,
    Link,
    LogOutIcon,
    MoreHorizontal,
    Settings2,
    UserCogIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useRouter } from "next/navigation"
import { CLIENT_ROUTES } from "@/routes/client.routes"
import { useSession } from "next-auth/react";

const data_nav = [
    {
        label: "Perfil",
        icon: UserCogIcon,
        url: CLIENT_ROUTES.urlPerfil
    },
]

type User = {
    name: string
    email: string
    avatar: string
}

export function NavSubMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const { data } = useSession();

    const router = useRouter()

    // obtener las iniciales del usuario para AvatarFallback
    const getInitials = (name: string) => {
        const names = name.split(" ")
        const initials = names.map((n) => n.charAt(0).toUpperCase()).join("")
        return initials
    }

    return (
        <div className="flex items-center gap-2 text-sm">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="data-[state=open]:bg-accent h-7 w-7 text-sidebar-foreground"
                    >
                        <MoreHorizontal />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-56 overflow-hidden rounded-lg p-0"
                    align="end"
                >
                    <Sidebar collapsible="none" className="bg-secondary text-secondary-foreground">
                        <SidebarContent>
                            {data?.user &&
                                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm border-b border-lime-400">
                                    <Avatar className="h-8 w-8 rounded-lg border bg-primary
                                    ">
                                        {/* <AvatarImage src="/next.svg" alt="User Avatar" /> */}
                                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">{getInitials(data.user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{data.user.name}</span>
                                        <span className="truncate text-xs">{data.user.email}</span>
                                    </div>
                                </div>
                            }
                            <SidebarGroup className="border-b last:border-none">
                                <SidebarGroupContent className="gap-0">
                                    <SidebarMenu>
                                        {data_nav.map((item, index) => (
                                            <SidebarMenuItem key={index}>
                                                <SidebarMenuButton onClick={() => { router.push(item.url) }} className="hover:text-secondary-foreground/80 hover:bg-transparent">
                                                    <item.icon /> <span>{item.label}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                            <SidebarGroup className="border-b last:border-none">
                                <SidebarGroupContent className="gap-0">
                                    <SidebarMenu>
                                        {data?.user ? (
                                            <SidebarMenuItem >
                                                <SidebarMenuButton onClick={() => { router.push(CLIENT_ROUTES.urlSignOut) }} className="text-red-400 hover:text-red-400/80 hover:bg-transparent">
                                                    <LogOutIcon /> <span>Cerrar Sesion</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ) :
                                            (
                                                <>
                                                    <SidebarMenuItem >
                                                        <SidebarMenuButton onClick={() => { router.push(CLIENT_ROUTES.urlLogin) }} className="hover:text-secondary-foreground/80 hover:bg-transparent">
                                                            <ArrowUp /> <span>Iniciar Sesion</span>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                    <SidebarMenuItem >
                                                        <SidebarMenuButton onClick={() => { router.push(CLIENT_ROUTES.urlRegister) }} className="hover:text-secondary-foreground/80 hover:bg-transparent">
                                                            <ArrowDown /> <span>Registrar</span>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                </>
                                            )
                                        }


                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                </PopoverContent>
            </Popover>
        </div>
    )
}
