"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useClientApi } from "@/hooks/useClientApi.hook";
import { useEffect, useState } from "react";
import { NotificacionesUserList } from "@/interfaces";
import NotificationList from "@/components/notifications/NotificationList";
import NotificationsHeader from "@/components/notifications/NotificationsHeader";


export default function NotificacionesPage() {

    const { get, put } = useClientApi(false);
    const [notificaciones, setNotificaciones] = useState<NotificacionesUserList | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchNotificaciones = async () => {
        setLoading(true);
        const { data, alert } = await get<NotificacionesUserList>("/notificaciones");

        if (alert === "success" && data) {
            console.log(data);
            setNotificaciones(data);
        } else {
            setNotificaciones(null);
        }

        setLoading(false);
    };

    const fetchCount = async () => {
        const { data, alert } = await get<{ count: number }>("/notificaciones/count");
        if (alert === "success" && data) {
            // si la API devuelve solo el count podríamos actualizar no_leidas
            setNotificaciones((prev) => ({ ...(prev || { total: 0, no_leidas: data.count, notificaciones: [] }), no_leidas: data.count } as NotificacionesUserList));
        }
    };

    const markAllAsRead = async () => {
        setLoading(true);
        const { alert } = await put(`/notificaciones/marcar-todas-leidas`);
        if (alert === "success") {
            await fetchNotificaciones();
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotificaciones();
        fetchCount();
    }, []);

    return (
        <div className="container mx-auto py-6 px-4 md:py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
                <p className="text-muted-foreground">Aquí irán las notificaciones del sistema</p>
            </div>

            <div>
                <NotificationsHeader
                    total={notificaciones?.total || 0}
                    noLeidas={notificaciones?.no_leidas || 0}
                    onMarkAllRead={markAllAsRead}
                />

                {loading ? (
                    <p>Cargando...</p>
                ) : (
                    <NotificationList data={notificaciones} />
                )}
            </div>
        </div>
    );
}
