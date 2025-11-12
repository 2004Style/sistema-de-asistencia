"use client"

import { ClientHorarioCreate } from "@/components/auth/turno-register";
import { useParams } from "next/navigation";

export default function RegisterHorarioPage() {
    const params = useParams();
    const id = Number(params?.id);
    return (
        <ClientHorarioCreate id_user={id} />
    )
}