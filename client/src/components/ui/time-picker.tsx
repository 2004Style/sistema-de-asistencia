"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimePickerProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
    value?: string
    onChange?: (value: string) => void
    format?: "HH:mm" | "HH:mm:ss"
}

export function TimePicker({
    value,
    onChange,
    format = "HH:mm:ss",
    className,
    ...props
}: TimePickerProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let timeValue = e.target.value

        // Si el formato es HH:mm:ss pero el input solo devuelve HH:mm, añadimos :00
        if (format === "HH:mm:ss" && timeValue && timeValue.split(":").length === 2) {
            timeValue = `${timeValue}:00`
        }

        onChange?.(timeValue)
    }

    // Convertir HH:mm:ss a HH:mm para el input nativo
    const displayValue = value && format === "HH:mm:ss" && value.split(":").length === 3
        ? value.split(":").slice(0, 2).join(":")
        : value

    return (
        <Input
            type="time"
            value={displayValue || ""}
            onChange={handleChange}
            step={format === "HH:mm:ss" ? "1" : undefined}
            className={cn("w-full", className)}
            style={{
                // Fuerza 24h en navegadores que lo soportan
                WebkitLocale: "es-ES",
            } as React.CSSProperties}
            {...props}
        />
    )
}
