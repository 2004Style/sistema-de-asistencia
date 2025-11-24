"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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

    // Animaciones en vivo para los íconos y el input cuando se muestran los métodos
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instances: any[] = [];
        let cancelled = false;

        const run = async () => {
            try {
                const { animate } = await import('animejs')

                if (!showMethods || cancelled) return

                // Pulse sutil para el botón de reconocimiento facial
                const scanEls = document.querySelectorAll('.scan-icon')
                if (scanEls && scanEls.length) {
                    const inst = animate(scanEls, {
                        scale: [{ from: 1, to: 1.08 }],
                        opacity: [{ from: 0.92, to: 1 }],
                        duration: 900,
                        easing: 'easeInOutSine',
                        direction: 'alternate',
                        loop: true
                    })
                    instances.push(inst)
                }

                // Movimiento tipo "escaneo" para huella
                const fpEls = document.querySelectorAll('.fingerprint-icon')
                if (fpEls && fpEls.length) {
                    const inst2 = animate(fpEls, {
                        translateY: [{ from: 0, to: -6 }],
                        rotate: [{ from: -6, to: 6 }],
                        duration: 1200,
                        easing: 'easeInOutSine',
                        direction: 'alternate',
                        loop: true
                    })
                    instances.push(inst2)
                }

                // Micro oscilación para el icono de edición
                const editEls = document.querySelectorAll('.edit-icon')
                if (editEls && editEls.length) {
                    const inst3 = animate(editEls, {
                        rotate: [{ from: -4, to: 4 }],
                        duration: 1500,
                        easing: 'easeInOutSine',
                        direction: 'alternate',
                        loop: true
                    })
                    instances.push(inst3)
                }

                // Brillo/halo sutil en el input
                const inputEls = document.querySelectorAll('.animated-input')
                if (inputEls && inputEls.length) {
                    const inst4 = animate(inputEls, {
                        boxShadow: [
                            { value: '0 0 0 0 rgba(0,255,0,0)' },
                            { value: '0 0 24px 6px rgba(0,255,0,0.06)' }
                        ],
                        duration: 2200,
                        easing: 'easeInOutSine',
                        direction: 'alternate',
                        loop: true
                    })
                    instances.push(inst4)
                }
            } catch (err) {
                console.error('anime error', err)
            }
        }

        run()

        return () => {
            cancelled = true
            instances.forEach(i => i?.pause && i.pause())
        }
    }, [showMethods])

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
                            className="card_asistencia_input animated-input"
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
                            <p className="card_asistencia_bienvenida scan-welcome">Bienvenido, <strong>{user.name}</strong>. Seleccione el método de verificación.</p>
                            <div className="relative overflow-hidden flex gap-4 py-4">
                                <Button
                                    onClick={() => handleSeleccionMetodo("facial")}
                                    className="card_asistencia_option_button scan-button"
                                    variant="outline"
                                >
                                    <Scan className="w-12 h-12 scan-icon" />
                                    <span className="text-wrap">Reconocimiento Facial</span>
                                </Button>
                                {!user.huella || user.huella !== "" &&
                                    <Button
                                        onClick={() => handleSeleccionMetodo("dactilar")}
                                        className="card_asistencia_option_button fingerprint-button"
                                        variant="outline"
                                    >
                                        <Fingerprint className="w-12 h-12 fingerprint-icon" />
                                        <span className="text-wrap">Huella Dactilar</span>
                                    </Button>
                                }
                                <Button
                                    onClick={() => handleSeleccionMetodo("manual")}
                                    className="card_asistencia_option_button edit-button"
                                    variant="outline"
                                >
                                    <Edit className="w-12 h-12 edit-icon" />
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
