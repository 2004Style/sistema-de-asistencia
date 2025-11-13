"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useClientApi } from "@/hooks/useClientApi.hook";
import { NotificacionDetails } from "@/interfaces";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import JsonViewer from "@/components/notifications/JsonViewer";

export default function NotificacionDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { GET, PUT } = useClientApi(false);
    const [notificacion, setNotificacion] = useState<NotificacionDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchDetail = async () => {
        setLoading(true);
        const { data, alert } = await GET<NotificacionDetails>(`/notificaciones/${id}`);
        if (alert === "success" && data) {
            setNotificacion(data);

            // Si la notificación no está leída, marcarla como leída automáticamente
            if (!data.leida) {
                const { alert: alertPut, data: dataPut } = await PUT(`/notificaciones/${id}/marcar-leida`);
                if (alertPut === "success" && dataPut) {
                    setNotificacion(dataPut as NotificacionDetails);
                } else {
                    // Fallback: marcar localmente
                    setNotificacion((prev) => prev ? { ...prev, leida: true, fecha_lectura: new Date().toISOString() } : prev);
                }
            }
        } else {
            setNotificacion(null);
        }
        setLoading(false);
    };

    const markRead = async () => {
        if (!notificacion) return;
        setLoading(true);
        const { alert } = await PUT(`/notificaciones/${notificacion.id}/marcar-leida`);
        if (alert === "success") {
            await fetchDetail();
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    return (
        <div className="container mx-auto py-6 px-4 md:py-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Detalle de notificación</h1>
            </div>

            {loading && <p>Cargando...</p>}

            {!loading && notificacion && (
                <Card>
                    <CardContent>
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">{notificacion.titulo}</h2>
                                <p className="text-sm text-muted-foreground mt-1">{new Date(notificacion.created_at).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {!notificacion.leida && (
                                    <Button variant="default" size="sm" onClick={markRead}>Marcar como leída</Button>
                                )}
                                <Link href="/admin/notificaciones">
                                    <Button variant="ghost" size="sm">Volver</Button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-base">{notificacion.mensaje}</p>
                        </div>

                        {notificacion.datos_adicionales !== null && notificacion.datos_adicionales !== undefined && (
                            <div className="mt-4">
                                <h3 className="font-medium">Datos adicionales</h3>
                                <div className="mt-2">
                                    <JsonViewer data={notificacion.datos_adicionales} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {!loading && !notificacion && <p>No se encontró la notificación.</p>}
        </div>
    );
}
