"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function SonnerDemo() {
    return (
        <div className="grid grid-cols-2 gap-3">
            {/* Normal */}
            <Button onClick={() => toast("Normal / Default")}>
                Normal
            </Button>

            {/* Success */}
            <Button onClick={() => toast.success("Operación exitosa ✅", {
                description: "Todo salió bien 🚀"
            })}>
                Success
            </Button>

            {/* Error */}
            <Button onClick={() => toast.error("Error ❌", {
                description: "No se pudo guardar el archivo"
            })}>
                Error
            </Button>

            {/* Warning */}
            <Button onClick={() => toast.warning("Advertencia ⚠️", {
                description: "Revisa la configuración"
            })}>
                Warning
            </Button>

            {/* Info */}
            <Button onClick={() => toast.info("Información ℹ️", {
                description: "Nueva actualización disponible"
            })}>
                Info
            </Button>

            {/* Loading */}
            <Button onClick={() => toast.loading("Cargando ⏳", {
                description: "Por favor espera..."
            })}>
                Loading
            </Button>

            {/* Con acción */}
            <Button
                onClick={() =>
                    toast("Evento creado 📅", {
                        description: "Domingo, 3 Dic 2023 a las 9:00 AM",
                        action: {
                            label: "Deshacer",
                            onClick: () => console.log("Deshacer"),
                        },
                    })
                }
            >
                Con acción
            </Button>

            {/* Con acción + cancelar */}
            <Button
                onClick={() =>
                    toast("Confirmar acción", {
                        cancel: {
                            label: "Cancelar",
                            onClick: () => console.log("Cancelado ❎"),
                        },
                        action: {
                            label: "Confirmar",
                            onClick: () => console.log("Confirmado ✅"),
                        },
                    })
                }
            >
                Acción + Cancelar
            </Button>

            {/* Rich Colors */}
            <Button
                onClick={() =>
                    toast.success("Colores intensos 🌈", {
                        description: "Modo richColors activo",
                        richColors: true,
                    })
                }
            >
                Rich Colors
            </Button>

            {/* Invert */}
            <Button
                onClick={() =>
                    toast.error("Invertido 🎨", {
                        description: "Invert = true",
                        invert: true,
                    })
                }
            >
                Invert
            </Button>

            {/* Unstyled + classNames */}
            <Button
                onClick={() =>
                    toast("Unstyled", {
                        unstyled: true,
                        className: "bg-black text-white p-4 rounded-lg shadow-lg",
                    })
                }
            >
                Unstyled
            </Button>

            {/* Con icono personalizado */}
            <Button
                onClick={() =>
                    toast("Con ícono custom", {
                        description: "Ícono = 🚀",
                        icon: "🚀",
                    })
                }
            >
                Icono Custom
            </Button>

            {/* Con closeButton */}
            <Button
                onClick={() =>
                    toast("Con botón de cerrar", {
                        closeButton: true,
                    })
                }
            >
                Close Button
            </Button>

            {/* Duración personalizada */}
            <Button
                onClick={() =>
                    toast("Desaparezco en 1s", {
                        duration: 1000,
                    })
                }
            >
                Duración 1s
            </Button>

            {/* Posiciones */}
            <Button
                onClick={() =>
                    toast("Arriba Izquierda", { position: "top-left" })
                }
            >
                Top Left
            </Button>

            <Button
                onClick={() =>
                    toast("Arriba Centro", { position: "top-center" })
                }
            >
                Top Center
            </Button>

            <Button
                onClick={() =>
                    toast("Arriba Derecha", { position: "top-right" })
                }
            >
                Top Right
            </Button>

            <Button
                onClick={() =>
                    toast("Abajo Izquierda", { position: "bottom-left" })
                }
            >
                Bottom Left
            </Button>

            <Button
                onClick={() =>
                    toast("Abajo Centro", { position: "bottom-center" })
                }
            >
                Bottom Center
            </Button>

            <Button
                onClick={() =>
                    toast("Abajo Derecha", { position: "bottom-right" })
                }
            >
                Bottom Right
            </Button>

            {/* Custom JSX */}
            <Button
                onClick={() =>
                    toast.custom((id) => (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                            <p className="font-bold">✨ Notificación Custom</p>
                            <p className="text-sm">Con tu propio diseño</p>
                            <button
                                onClick={() => toast.dismiss(id)}
                                className="mt-2 px-3 py-1 bg-white text-black rounded"
                            >
                                Cerrar
                            </button>
                        </div>
                    ))
                }
            >
                Custom JSX
            </Button>
        </div>
    )
}
