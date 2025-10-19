"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Eye, Edit, Trash2 } from "lucide-react";

interface ExtraAction<T> {
    label: string;
    onClick: (item: T) => void;
    icon?: React.ReactNode;
    variant?: "default" | "destructive";
    show?: (item: T) => boolean; // Función opcional para mostrar/ocultar acción condicionalmente
    separator?: boolean; // Si debe mostrar un separador antes de esta acción
}

interface TableActionsMenuProps<T> {
    item: T;
    onCopyId?: (id: string | number) => void;
    onViewDetails?: (item: T) => void;
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
    copyIdLabel?: string;
    extraActions?: Array<ExtraAction<T>>;
    extraActionsBeforeEdit?: Array<ExtraAction<T>>; // Acciones antes de editar/ver
    extraActionsAfterEdit?: Array<ExtraAction<T>>; // Acciones después de editar/ver
}

export function TableActionsMenu<T extends { id: string | number }>({
    item,
    onCopyId,
    onViewDetails,
    onEdit,
    onDelete,
    copyIdLabel = "Copiar ID",
    extraActions = [],
    extraActionsBeforeEdit = [],
    extraActionsAfterEdit = [],
}: TableActionsMenuProps<T>) {
    // Filtrar acciones extra que deben mostrarse
    const visibleExtraActions = extraActions.filter(
        (action) => !action.show || action.show(item)
    );
    const visibleExtraActionsBeforeEdit = extraActionsBeforeEdit.filter(
        (action) => !action.show || action.show(item)
    );
    const visibleExtraActionsAfterEdit = extraActionsAfterEdit.filter(
        (action) => !action.show || action.show(item)
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>

                {onCopyId && (
                    <>
                        <DropdownMenuItem onClick={() => onCopyId(item.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            {copyIdLabel}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Acciones extra antes de editar/ver */}
                {visibleExtraActionsBeforeEdit.length > 0 && (
                    <>
                        {visibleExtraActionsBeforeEdit.map((action, index) => (
                            <div key={`before-${index}`}>
                                {action.separator && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={() => action.onClick(item)}
                                    className={action.variant === "destructive" ? "text-destructive" : ""}
                                >
                                    {action.icon && <span className="mr-2">{action.icon}</span>}
                                    {action.label}
                                </DropdownMenuItem>
                            </div>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                )}

                {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                    </DropdownMenuItem>
                )}

                {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                )}

                {/* Acciones extra después de editar/ver */}
                {visibleExtraActionsAfterEdit.length > 0 && (
                    <>
                        {visibleExtraActionsAfterEdit.map((action, index) => (
                            <div key={`after-${index}`}>
                                {action.separator && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={() => action.onClick(item)}
                                    className={action.variant === "destructive" ? "text-destructive" : ""}
                                >
                                    {action.icon && <span className="mr-2">{action.icon}</span>}
                                    {action.label}
                                </DropdownMenuItem>
                            </div>
                        ))}
                    </>
                )}

                {/* Acciones extra (deprecated, mantener por compatibilidad) */}
                {visibleExtraActions.length > 0 && (
                    <>
                        {visibleExtraActions.map((action, index) => (
                            <DropdownMenuItem
                                key={index}
                                onClick={() => action.onClick(item)}
                                className={action.variant === "destructive" ? "text-destructive" : ""}
                            >
                                {action.icon && <span className="mr-2">{action.icon}</span>}
                                {action.label}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}

                {onDelete && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
