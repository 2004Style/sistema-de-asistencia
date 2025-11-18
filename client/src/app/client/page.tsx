"use client"

import { CLIENT_ROUTES } from "@/routes/client.routes";
import { useRouter } from "next/navigation";


export default function ClientPage() {

    const router = useRouter()

    return router.replace(CLIENT_ROUTES.urlUserAsistencias)
}