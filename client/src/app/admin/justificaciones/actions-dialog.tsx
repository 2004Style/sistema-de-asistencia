"use client";

import { useState } from "react";
import { useJustificacionesApi } from "@/hooks/useJustificacionesApi.hook";
import { useSession } from "next-auth/react";
import { JustificacionList } from "@/interfaces/justificaciones.interface";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface ActionsDialogProps {
    justificacion: JustificacionList | null;
    action: "approve" | "reject" | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ActionsDialog({
    justificacion,
    action,
    isOpen,
    onOpenChange,
    onSuccess,
}: ActionsDialogProps) {
    const { data: session } = useSession();
    const { approve, reject } = useJustificacionesApi();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comentario, setComentario] = useState("");

    const handleSubmit = async () => {
        if (!justificacion || !action || !session?.user?.id) return;

        setLoading(true);
        setError(null);

        try {
            let response;

            if (action === "approve") {
                response = await approve(
                    justificacion.id,
                    session.user.id,
                    comentario || undefined
                );
            } else {
                if (!comentario.trim()) {
                    setError("El comentario es obligatorio para rechazar");
                    setLoading(false);
                    return;
                }
                response = await reject(
                    justificacion.id,
                    session.user.id,
                    comentario
                );
            }

            if (response.alert === "success") {
                setComentario("");
                onOpenChange(false);
                onSuccess();
            } else {
                setError(response.message || "Error en la operación");
            }
        } catch (err: unknown) {
            const error = err as Record<string, unknown>;
            setError((error.message as string) || "Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    const isReject = action === "reject";
    const title = isReject ? "Rechazar justificación" : "Aprobar justificación";
    const description = isReject
        ? "Proporciona un comentario explicando el motivo del rechazo"
        : "Opcionalmente, añade un comentario";

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 py-4">
                    {justificacion && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Justificación:</p>
                            <p className="text-sm text-muted-foreground">
                                {justificacion.usuario_nombre} - {justificacion.tipo}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="comentario">
                            Comentario {isReject ? "*" : "(opcional)"}
                        </Label>
                        <Textarea
                            id="comentario"
                            placeholder={
                                isReject
                                    ? "Explica el motivo del rechazo..."
                                    : "Añade un comentario (opcional)..."
                            }
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant={isReject ? "destructive" : "default"}
                        onClick={handleSubmit}
                        disabled={loading || (isReject && !comentario.trim())}
                        className="gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isReject ? "Rechazar" : "Aprobar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
