"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { ensureArray, getErrorMessage } from "@/utils";
import { User } from "@/interfaces/user.interface";
import { CheckCircle2, XCircle, Fingerprint, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import Link from "next/link";
import { HuellaVerificationModal, MetodoVerificacion } from "@/components/huella/HuellaVerificationModal";
import { useState } from "react";

// Definición de columnas para la tabla de usuarios
// onRegisterFingerprint es una función opcional que, si se proporciona,
// será llamada cuando el usuario elija "Registrar Huella" desde el menú.
const createColumns = (
    tableActions: ReturnType<typeof useTableActions<User>>,
    onRegisterFingerprint?: (user: User) => void
): ColumnDef<User>[] => [
        {
            accessorKey: "id",
            header: ({ column }) => <SortableHeader column={column} title="ID" />,
            cell: ({ row }) => <div className="font-medium">#{row.getValue("id")}</div>,
        },
        {
            accessorKey: "name",
            header: ({ column }) => <SortableHeader column={column} title="Nombre" />,
            cell: ({ row }) => {
                const name = row.getValue("name") as string;
                const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{name}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "email",
            header: ({ column }) => <SortableHeader column={column} title="Email" />,
            cell: ({ row }) => (
                <div className="lowercase text-muted-foreground">{row.getValue("email")}</div>
            ),
        },
        {
            accessorKey: "codigo_user",
            header: ({ column }) => <SortableHeader column={column} title="Código" />,
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono">
                    {row.getValue("codigo_user")}
                </Badge>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Estado",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean;
                return (
                    <Badge variant={isActive ? "default" : "secondary"} className="gap-1">
                        {isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                        ) : (
                            <XCircle className="h-3 w-3" />
                        )}
                        {isActive ? "Activo" : "Inactivo"}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "huella",
            header: "Huella",
            cell: ({ row }) => {
                const huella = row.getValue("huella");
                return (
                    <Badge
                        variant={huella ? "default" : "outline"}
                        className="gap-1"
                    >
                        <Fingerprint className="h-3 w-3" />
                        {huella ? "Registrada" : "No registrada"}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => <SortableHeader column={column} title="Fecha de registro" />,
            cell: ({ row }) => {
                const date = new Date(row.getValue("created_at"));
                return (
                    <div className="text-sm text-muted-foreground">
                        {date.toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Acciones",
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <TableActionsMenu
                        item={user}
                        onCopyId={tableActions.handleCopyId}
                        onViewDetails={tableActions.handleViewDetails}
                        onEdit={tableActions.handleEdit}
                        onDelete={tableActions.openDeleteDialog}
                        copyIdLabel="Copiar código de usuario"
                        extraActionsBeforeEdit={[
                            {
                                label: "Registrar Huella",
                                icon: <Fingerprint className="h-4 w-4" />,
                                // Si se pasó onRegisterFingerprint, llamarla para abrir el modal;
                                // en caso contrario, mantener el comportamiento por defecto (navegar).
                                onClick: (u: User) => {
                                    if (onRegisterFingerprint) return onRegisterFingerprint(u);
                                    return tableActions.createNavigateAction(
                                        (x: User) => `/admin/users/${x.id}/register-fingerprint`
                                    )(u);
                                },
                                show: (v: User) => !v.huella, // Solo mostrar si no tiene huella
                                separator: false,
                            },
                        ]}
                    />
                );
            },
        },
    ];

export default function UsersPage() {
    const {
        data: users,
        isLoading,
        tableState,
        totalPages,
        totalRecords,
        setPage,
        setPageSize,
        setSearch,
        setSorting,
        refresh,
    } = useServerTable<User>({
        endpoint: BACKEND_ROUTES.urlUsuarios,
        initialPageSize: 10,
    });

    const tableActions = useTableActions<User>({
        resourceName: "usuario",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlUsuarios}/${id}`,
        editRoute: (id) => `/admin/users/${id}/edit`,
        detailRoute: (id) => `/admin/users/${id}`,
        onDeleteSuccess: refresh,
    });

    const [modalType, setModalType] = useState<MetodoVerificacion | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleHuellaSuccess = (_data: unknown) => {
        // cerrar modal y refrescar tabla
        setModalType(null);
        setSelectedUser(null);
        refresh();
    };

    const handleHuellaError = (_data: unknown) => {
        setModalType(null);
        setSelectedUser(null);
    };

    const columns = createColumns(tableActions, (user: User) => {
        setSelectedUser(user);
        setModalType("dactilar");
    });

    return (
        <div className="container mx-auto ">
            <div className="mb-6 flex items-center w-full justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
                    <p className="text-muted-foreground">
                        Gestiona y visualiza todos los usuarios del sistema
                    </p>
                </div>
                <Link href="#" className="flex gap-3 bg-foreground text-background px-3 py-2 rounded-md">
                    <Plus />
                    <span>Crear Usuario</span>
                </Link>
            </div>

            <DataTable
                columns={columns}
                data={users}
                isLoading={isLoading}
                searchPlaceholder="Buscar por nombre, email o código..."
                currentPage={tableState.page}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={tableState.pageSize}
                searchValue={tableState.search}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onSearchChange={setSearch}
                onSortingChange={setSorting}
            />

            <DeleteConfirmationDialog
                open={tableActions.isDeleteDialogOpen}
                onOpenChange={tableActions.closeDeleteDialog}
                onConfirm={tableActions.handleDelete}
                title="¿Eliminar usuario?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el usuario y todos sus datos asociados."
                itemName={tableActions.itemToDelete?.name}
                isLoading={tableActions.isDeleting}
            />

            <HuellaVerificationModal
                open={modalType === "dactilar"}
                onOpenChange={(open) => {
                    if (!open) {
                        setModalType(null);
                        setSelectedUser(null);
                    }
                }}
                tipo="registro"
                codigo={selectedUser?.codigo_user || ""}
                userId={selectedUser?.id || 0}
                onSuccess={handleHuellaSuccess}
                onError={handleHuellaError}
                showInternalSuccessModal={true}
            />
        </div>
    );
}