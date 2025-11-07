// /auth/callback/CallbackClient.js (componente cliente)
'use client';

import { useEffect, useMemo } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import { Card } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export default function CallbackClient() {
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get('token'), [searchParams]);


    useEffect(() => {
        const doAuth = async () => {
            if (!token) return;

            try {
                await signIn('credentials', {
                    redirect: true,
                    callbackUrl: '/',
                    email: token,
                    password: 'fake',
                });
            } catch (err) {
                console.error(err);
            }
        };

        doAuth();
    }, [token]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
            <Card className="w-full max-w-md p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 animate-spin">
                            <Shield className="w-16 h-16 text-primary/20" />
                        </div>
                        <Shield className="w-16 h-16 text-primary" />
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">Authenticating</h2>
                        <p className="text-muted-foreground">Please wait while we verify your credentials</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting to secure server</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}


