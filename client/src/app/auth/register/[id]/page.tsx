"use client"

import { ClientHorarioCreate } from "@/components/auth/turno-register";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterHorarioPage() {
    const params = useParams();
    const id = Number(params?.id);
    const [userId, setUserId] = useState<number>(id);

    useEffect(() => {
        setUserId(id);
    }, [id]);

    return (
        <div className="p-4 md:py-10">
            <ClientHorarioCreate id_user={userId} />
        </div>
    )
}