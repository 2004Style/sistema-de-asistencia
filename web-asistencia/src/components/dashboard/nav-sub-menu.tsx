"use client"

import {
    ArrowDown,
    ArrowUp,
    Copy,
    CornerUpLeft,
    FileText,
    LineChart,
    Link,
    MoreHorizontal,
    Settings2,
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

const data = [
    [
        {
            label: "Customize Page",
            icon: Settings2,
            url: "#"
        },
        {
            label: "Turn into wiki",
            icon: FileText,
            url: "#"
        },
    ],
    [
        {
            label: "Copy Link",
            icon: Link,
            url: "#"
        },
        {
            label: "Duplicate",
            icon: Copy,
            url: "#"
        },
    ],
    [
        {
            label: "Undo",
            icon: CornerUpLeft,
            url: "#"
        },
        {
            label: "View analytics",
            icon: LineChart,
            url: "#"
        },
    ],
    [
        {
            label: "Login",
            icon: ArrowUp,
            url: CLIENT_ROUTES.urlLogin
        },
        {
            label: "Register",
            icon: ArrowDown,
            url: CLIENT_ROUTES.urlRegister
        },
    ],
]

type User = {
    name: string
    email: string
    avatar: string
}

export function NavSubMenu() {
    const [isOpen, setIsOpen] = useState(false)

    const router = useRouter()

    return (
        <div className="flex items-center gap-2 text-sm">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="data-[state=open]:bg-accent h-7 w-7"
                    >
                        <MoreHorizontal />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-56 overflow-hidden rounded-lg p-0"
                    align="end"
                >
                    <Sidebar collapsible="none" className="bg-transparent">
                        <SidebarContent>
                            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm border-b border-lime-400">
                                <Avatar className="h-8 w-8 rounded-lg border">
                                    <AvatarImage src="/next.svg" alt="User Avatar" />
                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">ronald</span>
                                    <span className="truncate text-xs">ronald@example.com</span>
                                </div>
                            </div>
                            {data.map((group, index) => (
                                <SidebarGroup key={index} className="border-b last:border-none">
                                    <SidebarGroupContent className="gap-0">
                                        <SidebarMenu>
                                            {group.map((item, index) => (
                                                <SidebarMenuItem key={index}>
                                                    <SidebarMenuButton onClick={() => {router.push(item.url)}}>
                                                        <item.icon /> <span>{item.label}</span>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            ))}
                        </SidebarContent>
                    </Sidebar>
                </PopoverContent>
            </Popover>
        </div>
    )
}
