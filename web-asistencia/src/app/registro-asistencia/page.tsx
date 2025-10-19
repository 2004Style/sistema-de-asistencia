"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, Scan, XCircle, Clock, Edit } from "lucide-react";
import { ResponseVerifyUserCode, useVerifyUserCode } from "@/hooks/verifye-user-code.hook";
import { HuellaVerificationModal } from "@/components/huella/HuellaVerificationModal";
import { RegistroManualModal } from "@/components/registro-manual/RegistroManualModal";

const CODE_LENGTH = 3;

type MetodoVerificacion = "facial" | "dactilar" | "manual";

export default function RegistroAsistenciaPage() {
    const router = useRouter();
    const { verifyUserCode } = useVerifyUserCode();

    const [user, setUser] = useState<ResponseVerifyUserCode | null>(null);
    const [codigo, setCodigo] = useState("");
    const [error, setError] = useState("");
    const [showMethods, setShowMethods] = useState(false);
    const [modalType, setModalType] = useState<MetodoVerificacion | null>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const consultadoRef = useRef("");

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (codigo.length !== CODE_LENGTH) {
            setUser(null);
            setShowMethods(false);
            setError("");
            return;
        }

        if (consultadoRef.current === codigo) return;

        timeoutRef.current = setTimeout(async () => {
            if (codigo.length !== CODE_LENGTH) return;

            consultadoRef.current = codigo;
            setError("");

            const { user: foundUser } = await verifyUserCode({ codigo_user: codigo });

            if (!foundUser) {
                setError("Código no encontrado");
                setUser(null);
                setShowMethods(false);
                return;
            }

            setUser(foundUser);
            setShowMethods(true);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [codigo, verifyUserCode]);

    const limpiarFormulario = () => {
        setCodigo("");
        setUser(null);
        setShowMethods(false);
        setError("");
        setModalType(null);
        consultadoRef.current = "";
    };

    const registrarAsistencia = async () => {
        setTimeout(limpiarFormulario, 3000);
    };

    const handleSeleccionMetodo = (metodo: MetodoVerificacion) => {
        if (metodo === "facial") {
            router.push(`/registro-asistencia/facial?codigo=${codigo}`);
            return;
        }
        setModalType(metodo);
    };

    const handleHuellaSuccess = async () => {
        await registrarAsistencia();
    };

    return (
        <div className="min-h-screen bg-base flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                        <Clock className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <CardTitle className="text-3xl font-bold">Registro de Asistencia</CardTitle>
                    <CardDescription>
                        Ingrese su código y seleccione el tipo de registro
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="codigo">Código de Usuario</Label>
                        <Input
                            id="codigo"
                            placeholder="Ingrese su código"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            className="text-lg"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {showMethods && user && (
                        <>
                            <p>Bienvenido, <strong>{user.name}</strong>. Seleccione el método de verificación.</p>
                            <div className="grid grid-cols-3 gap-4 py-4">
                                <Button
                                    onClick={() => handleSeleccionMetodo("facial")}
                                    className="h-32 flex-col gap-3"
                                    variant="outline"
                                >
                                    <Scan className="w-12 h-12" />
                                    <span className="text-base text-wrap">Reconocimiento Facial</span>
                                </Button>
                                <Button
                                    onClick={() => handleSeleccionMetodo("dactilar")}
                                    className="h-32 flex-col gap-3"
                                    variant="outline"
                                >
                                    <Fingerprint className="w-12 h-12" />
                                    <span className="text-base text-wrap">Huella Dactilar</span>
                                </Button>
                                <Button
                                    onClick={() => handleSeleccionMetodo("manual")}
                                    className="h-32 flex-col gap-3"
                                    variant="outline"
                                >
                                    <Edit className="w-12 h-12" />
                                    <span className="text-base text-wrap">Registro Manual</span>
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <HuellaVerificationModal
                open={modalType === "dactilar"}
                onOpenChange={(open) => {
                    if (!open) setModalType(null);
                }}
                codigo={codigo}
                userId={user?.id || 0}
                onSuccess={handleHuellaSuccess}
                onError={(data) => console.error("Error en verificación de huella:", data)}
                showInternalSuccessModal={true}
            />

            <RegistroManualModal
                open={modalType === "manual"}
                onOpenChange={(open) => {
                    if (!open) setModalType(null);
                }}
                user={user}
                onSuccess={registrarAsistencia}
            />
        </div>
    );
}
