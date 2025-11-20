"use client"
import { GalleryVerticalEnd } from "lucide-react"

import { SignupForm } from "@/components/auth/register"
import { CLIENT_ROUTES } from "@/routes/client.routes"

export default function SignupPage() {
    return (
        <div className="flex flex-col gap-4 p-6 md:p-10">
            <div className="flex justify-center gap-2 md:justify-start">
                <a href={CLIENT_ROUTES.urlHome} className="flex items-center gap-2 font-medium">
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    Home
                </a>
            </div>
            <SignupForm />
        </div>
    )
}
