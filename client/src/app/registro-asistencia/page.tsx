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
import { HuellaVerificationModal, MetodoVerificacion } from "@/components/huella/HuellaVerificationModal";
import { RegistroManualModal } from "@/components/registro-manual/RegistroManualModal";
import "./registro-asistencia.css"
import { CLIENT_ROUTES } from "@/routes/client.routes";
import ShinyText from "@/components/react-beats/ShinyText/ShinyText";

const CODE_LENGTH = 3;

export default function RegistroAsistenciaPage() {
    const router = useRouter();
    const { verifyUserCode } = useVerifyUserCode();

    const [user, setUser] = useState<ResponseVerifyUserCode | null>(null);
    const [codigo, setCodigo] = useState("");
    const [error, setError] = useState("");
    const [showMethods, setShowMethods] = useState(false);
    const [modalType, setModalType] = useState<MetodoVerificacion | null>(null);

    const [consultado, setConsultado] = useState(false);

    const consultarUser = async (_codigo: string) => {
        setConsultado(true)
        setError("");

        console.log("validando codigo:", _codigo);

        const { user: foundUser } = await verifyUserCode({ codigo_user: _codigo });

        if (!foundUser) {
            setError("Código no encontrado");
            setUser(null);
            setShowMethods(false);
            return;
        }

        setUser(foundUser);
        setShowMethods(true);
    }

    useEffect(() => {
        if (codigo.length !== CODE_LENGTH) {
            setUser(null);
            setConsultado(false);
            setShowMethods(false);
            setError("");
            return;
        }

        if (consultado === true) {
            return;
        }

        consultarUser(codigo);
    }, [codigo]);

    const limpiarFormulario = () => {
        setCodigo("");
        setUser(null);
        setShowMethods(false);
        setError("");
        setModalType(null);
        setConsultado(false);
    };

    const registrarAsistencia = async () => {
        setTimeout(limpiarFormulario, 3000);
    };

    const handleSeleccionMetodo = (metodo: MetodoVerificacion) => {
        if (metodo === "facial") {
            router.replace(`${CLIENT_ROUTES.urlPublicAsistencia}/facial?codigo=${codigo}`);
            return;
        }
        setModalType(metodo);
    };

    const handleHuellaSuccess = async () => {
        await registrarAsistencia();
    };

    return (
        <div className="min-h-screen bg-base flex items-center justify-center p-4">
            <Card className="w-full max-w-md rounded-[5px] border-none card_asistencia">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                        <Clock className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    {/* <CardTitle className="text-3xl card_asistencia_title">Registro de Asistencia</CardTitle> */}
                    <ShinyText
                        text="Registro de Asistencia"
                        disabled={false}
                        speed={3}
                        className='text-3xl font-extrabold'
                    />
                    <CardDescription className="card_asistencia_description">
                        Ingrese su código y seleccione el tipo de registro
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="codigo" className="card_asistencia_label">Código de Usuario</Label>
                        <Input
                            id="codigo"
                            placeholder="Ingrese su código"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            className="card_asistencia_input"
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
                            <p className="card_asistencia_bienvenida">Bienvenido, <strong>{user.name}</strong>. Seleccione el método de verificación.</p>
                            <div className="relative overflow-hidden flex gap-4 py-4">
                                <Button
                                    onClick={() => handleSeleccionMetodo("facial")}
                                    className="card_asistencia_option_button"
                                    variant="outline"
                                >
                                    <Scan className="w-12 h-12" />
                                    <span className="text-wrap">Reconocimiento Facial</span>
                                </Button>
                                {!user.huella || user.huella !== "" &&
                                    <Button
                                        onClick={() => handleSeleccionMetodo("dactilar")}
                                        className="card_asistencia_option_button"
                                        variant="outline"
                                    >
                                        <Fingerprint className="w-12 h-12" />
                                        <span className="text-wrap">Huella Dactilar</span>
                                    </Button>
                                }
                                <Button
                                    onClick={() => handleSeleccionMetodo("manual")}
                                    className="card_asistencia_option_button"
                                    variant="outline"
                                >
                                    <Edit className="w-12 h-12" />
                                    <span className="text-wrap">Registro Manual</span>
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
                huella={user?.huella}
                onSuccess={handleHuellaSuccess}
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
