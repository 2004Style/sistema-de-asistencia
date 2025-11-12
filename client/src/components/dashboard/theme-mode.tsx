"use client";

import { useTheme } from "next-themes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Monitor, Moon, Palette, Sun } from "lucide-react";

export function Thememode() {
    const { isMobile } = useSidebar()
    const { setTheme } = useTheme()

    return (
        <SidebarMenuItem className="p-0 px-2 ">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="hover:text-secondary-foreground/80 hover:bg-transparent border-none cursor-pointer">
                            <Palette />
                            <span>theme</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-24 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align={isMobile ? "end" : "start"}
                    >
                        <DropdownMenuItem onClick={() => setTheme("light")} >
                            <Sun className="hover:text-sidebar-foreground" />
                            <span>Claro</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="hover:text-sidebar-foreground" />
                            <span>Oscuro</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                            <Monitor className="hover:text-sidebar-foreground" />
                            <span>Sistema</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
    )
}
