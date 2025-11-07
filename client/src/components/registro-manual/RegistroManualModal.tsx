"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle } from "lucide-react";
import { useClientApi } from "@/hooks/useClientApi.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { ResponseVerifyUserCode } from "@/hooks/verifye-user-code.hook";

const OBSERVATIONS_MIN = 10;

interface RegistroManualModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: ResponseVerifyUserCode | null;
    onSuccess: () => Promise<void>;
}

export function RegistroManualModal({ open, onOpenChange, user, onSuccess }: RegistroManualModalProps) {
    const { post } = useClientApi(false);
    const [observaciones, setObservaciones] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleClose = () => {
        setObservaciones("");
        setError("");
        setLoading(false);
        onOpenChange(false);
    };

    const handleRegistro = async () => {
        const obs = observaciones.trim();

        if (!obs) {
            setError("Por favor ingrese el motivo del registro manual");
            return;
        }
        if (obs.length < OBSERVATIONS_MIN) {
            setError(`El motivo debe tener al menos ${OBSERVATIONS_MIN} caracteres`);
            return;
        }
        if (!user?.id) {
            setError("No se pudo obtener el ID del usuario");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await post(`${BACKEND_ROUTES.urlAsistencias}/registrar-manual`, {
                user_id: user.id,
                observaciones: obs
            });

            if (response.alert === "success") {
                handleClose();
                await onSuccess();
            } else {
                setError(response.message || "Error al registrar la asistencia");
            }
        } catch (err) {
            console.error("Error al registrar asistencia manual:", err);
            setError("Error al registrar la asistencia manual");
        } finally {
            setLoading(false);
        }
    };

    const obsLength = observaciones.trim().length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Registro Manual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="observaciones">
                            Motivo del registro manual <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="observaciones"
                            placeholder="Ej: No funcionaba el servicio biométrico y facial"
                            value={observaciones}
                            onChange={(e) => {
                                setObservaciones(e.target.value);
                                setError("");
                            }}
                            className="min-h-[100px] resize-none"
                            disabled={loading}
                        />
                        <div className="flex flex-wrap justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Por favor, especifique el motivo por el cual está realizando un registro manual.
                            </p>
                            <p className={`text-sm ${obsLength < OBSERVATIONS_MIN ? 'text-rose-500' : 'text-green-600'}`}>
                                {obsLength} / {OBSERVATIONS_MIN}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
                <DialogFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRegistro}
                        disabled={loading || obsLength < OBSERVATIONS_MIN}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Registrando...
                            </>
                        ) : (
                            "Registrar"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
