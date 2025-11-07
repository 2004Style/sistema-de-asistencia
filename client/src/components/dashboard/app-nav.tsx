"use client"

import { SidebarIcon } from "lucide-react"
import { NavSubMenu } from "./nav-sub-menu"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function AppNav() {
    const { toggleSidebar } = useSidebar()
    const pathname = usePathname()

    // Dividir ruta en segmentos
    const segments = pathname.split("/").filter(Boolean)

    return (
        <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
            <div className="flex h-8 w-full items-center gap-2 px-4 justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        className="h-8 w-8"
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                    >
                        <SidebarIcon />
                    </Button>
                    <Separator orientation="vertical" className="mr-2 h-4" />

                    <Breadcrumb className="hidden sm:block">
                        <BreadcrumbList>
                            {/* Siempre mostrar Home */}
                            <BreadcrumbItem>
                                {segments.length === 0 ? (
                                    <BreadcrumbPage>Home</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>

                            {/* Separador si hay más rutas */}
                            {segments.length > 0 && <BreadcrumbSeparator />}

                            {segments.map((segment, index) => {
                                const href = "/" + segments.slice(0, index + 1).join("/")
                                const isLast = index === segments.length - 1

                                return (
                                    <BreadcrumbItem key={href}>
                                        {!isLast ? (
                                            <>
                                                <BreadcrumbLink href={href}>
                                                    {segment}
                                                </BreadcrumbLink>
                                                <BreadcrumbSeparator />
                                            </>
                                        ) : (
                                            <BreadcrumbPage>{segment}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                )
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <NavSubMenu />
            </div>
        </header>
    )
}
