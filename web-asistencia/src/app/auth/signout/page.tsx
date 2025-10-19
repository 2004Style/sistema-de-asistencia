"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogOut, CheckCircle2 } from "lucide-react";

export default function SignOutLoading() {
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100) {
                    if (timerRef.current !== null) {
                        clearInterval(timerRef.current);
                    }
                    setIsComplete(true);
                    signOut({ callbackUrl: "/auth" });
                    return 100;
                }
                return Math.min(oldProgress + 10, 100);
            });
        }, 50);

        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
            <Card className="w-full max-w-md p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
                <div className="flex flex-col items-center space-y-6">
                    {isComplete ? (
                        <div className="text-green-500 animate-in fade-in-0 zoom-in-95 duration-500">
                            <CheckCircle2 className="w-16 h-16" />
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping">
                                <LogOut className="w-16 h-16 text-primary/20" />
                            </div>
                            <LogOut className="w-16 h-16 text-primary" />
                        </div>
                    )}

                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">
                            {isComplete ? 'Goodbye!' : 'Signing Out'}
                        </h2>
                        <p className="text-muted-foreground">
                            {isComplete
                                ? 'You have been successfully signed out'
                                : 'Please wait while we securely sign you out'}
                        </p>
                    </div>

                    {!isComplete && (
                        <>
                            <div className="w-full space-y-2">
                                <Progress value={progress} className="h-2" />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Clearing session data...</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span>Securing your account</span>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}