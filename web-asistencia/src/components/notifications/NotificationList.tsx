"use client";

import React from "react";
import { NotificacionesUserList, NotificacionDetails } from "@/interfaces";
import NotificationItem from "./NotificationItem";

interface Props {
    data: NotificacionesUserList | null;
}

export const NotificationList: React.FC<Props> = ({ data }) => {
    if (!data || !data.notificaciones || data.notificaciones.length === 0) {
        return (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border">
                <p className="text-center text-muted-foreground">No hay notificaciones por ahora.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {data.notificaciones.map((n: NotificacionDetails) => (
                <NotificationItem key={n.id} item={n} />
            ))}
        </div>
    );
};

export default NotificationList;
