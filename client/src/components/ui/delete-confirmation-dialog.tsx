"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    itemName?: string;
    isLoading?: boolean;
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "¿Estás seguro?",
    description = "Esta acción no se puede deshacer. Esto eliminará permanentemente el registro.",
    itemName,
    isLoading = false,
}: DeleteConfirmationDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </div>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-base">
                        {description}
                        {itemName && (
                            <span className="mt-2 block font-semibold text-foreground">
                                {itemName}
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Eliminando...
                            </>
                        ) : (
                            "Eliminar"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
