"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
    total: number;
    noLeidas: number;
    onMarkAllRead: () => Promise<void>;
}

export const NotificationsHeader: React.FC<Props> = ({ total, noLeidas, onMarkAllRead }) => {

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-semibold">Notificaciones</h2>
                <p className="text-sm text-muted-foreground mt-1">Total: <span className="font-medium">{total}</span> — No leídas: <span className="font-medium text-amber-600 dark:text-amber-400">{noLeidas}</span></p>
            </div>

            <div className="flex items-center gap-3">
                {noLeidas > 0 && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Marcar todas como leídas</Button>
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirmar acción</DialogTitle>
                                <DialogDescription>¿Deseas marcar todas las notificaciones como leídas? Esta acción no puede deshacerse.</DialogDescription>
                            </DialogHeader>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="ghost" size="sm">Cancelar</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button variant="default" size="sm" onClick={async () => await onMarkAllRead()}>Sí, marcar todas</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
};

export default NotificationsHeader;
