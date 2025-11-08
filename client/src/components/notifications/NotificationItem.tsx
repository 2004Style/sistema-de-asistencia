"use client";

import React from "react";
import { NotificacionDetails } from "@/interfaces";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
    item: NotificacionDetails;
}

const priorityVariant = (p: NotificacionDetails["prioridad"]) => {
    switch (p) {
        case "urgente":
            return { label: "Urgente", variant: "destructive" } as const;
        case "alta":
            return { label: "Alta", variant: "default" } as const;
        case "media":
            return { label: "Media", variant: "secondary" } as const;
        default:
            return { label: "Baja", variant: "outline" } as const;
    }
};

export const NotificationItem: React.FC<Props> = ({ item }) => {
    const pv = priorityVariant(item.prioridad);

    return (
        <Card className={`p-3 ${item.leida ? "opacity-60 border-gray-200 dark:border-gray-700" : "ring-1 ring-primary/10"}`}>
            <CardContent className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                    <Badge variant={pv.variant as "default" | "secondary" | "outline" | "destructive"} className="w-10 h-10 flex items-center justify-center rounded-full text-sm">{pv.label[0]}</Badge>
                </div>

                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold leading-5">{item.titulo}</h3>
                                {item.leida ? (
                                    <Badge variant="outline" className="text-xs">Leída</Badge>
                                ) : (
                                    <Badge variant="default" className="text-xs">Nueva</Badge>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground mt-1">{item.mensaje}</p>
                        </div>

                        <div className="text-right ml-4 flex flex-col items-end gap-2">
                            <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                            <Link href={`/admin/notificaciones/${item.id}`}>
                                <Button variant="outline" size="sm">Ver</Button>
                            </Link>
                        </div>
                    </div>

                    {item.accion_url && (
                        <div className="mt-3">
                            <a className="inline-block text-sm font-medium text-primary hover:underline" href={item.accion_url}>
                                {item.accion_texto || "Ver"}
                            </a>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default NotificationItem;
