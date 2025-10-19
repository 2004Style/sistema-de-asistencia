"use client";
import { Suspense } from "react";
import CallbackClient from "./component";

export default function CallbackPage() {
    return (
        <>
            <Suspense fallback={<p>Cargando...</p>}>
                <CallbackClient/>
            </Suspense>
        </>
    )

}


