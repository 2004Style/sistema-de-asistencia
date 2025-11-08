"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { ensureArray, getErrorMessage } from "@/utils";
import { RoleList } from "@/interfaces";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import Link from "next/link";
import { Plus } from "lucide-react";
import BtnLink from "@/components/btn-link";
import { CLIENT_ROUTES } from "@/routes/client.routes";

// Definición de columnas para la tabla de roles
const createColumns = (tableActions: ReturnType<typeof useTableActions<RoleList>>): ColumnDef<RoleList>[] => [
    {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column} title="ID" />,
        cell: ({ row }) => (
            <div className="font-mono text-xs">{row.getValue("id")}</div>
        ),
    },
    {
        accessorKey: "nombre",
        header: ({ column }) => <SortableHeader column={column} title="Nombre" />,
        cell: ({ row }) => {
            return (
                <div>
                    <div className="font-medium">{row.getValue("nombre")}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.descripcion}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "es_admin",
        header: "Es Admin",
        cell: ({ row }) => {
            const esAdmin = row.getValue("es_admin") as boolean;
            return (
                <Badge variant={esAdmin ? "default" : "secondary"} className="gap-1">
                    {esAdmin ? "Sí" : "No"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "puede_aprobar",
        header: "Puede Aprobar",
        cell: ({ row }) => {
            const puedeAprobar = row.getValue("puede_aprobar") as boolean;
            return (
                <Badge variant={puedeAprobar ? "default" : "secondary"} className="gap-1">
                    {puedeAprobar ? "Sí" : "No"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "puede_ver_reportes",
        header: "Puede Ver Reportes",
        cell: ({ row }) => {
            const puedeVerReportes = row.getValue("puede_ver_reportes") as boolean;
            return (
                <Badge variant={puedeVerReportes ? "default" : "secondary"} className="gap-1">
                    {puedeVerReportes ? "Sí" : "No"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "puede_gestionar_usuarios",
        header: "Puede Gestionar Usuarios",
        cell: ({ row }) => {
            const puedeGestionarUsuarios = row.getValue("puede_gestionar_usuarios") as boolean;
            return (
                <Badge variant={puedeGestionarUsuarios ? "default" : "secondary"} className="gap-1">
                    {puedeGestionarUsuarios ? "Sí" : "No"}
                </Badge>
            );
        },
    },
    {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => {
            const activo = row.getValue("activo") as boolean;
            return (
                <Badge variant={activo ? "default" : "destructive"} className="gap-1">
                    {activo ? "Sí" : "No"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Acciones",
        enableHiding: false,
        cell: ({ row }) => {
            const rol = row.original;

            return (
                <TableActionsMenu
                    item={rol}
                    onCopyId={tableActions.handleCopyId}
                    onViewDetails={tableActions.handleViewDetails}
                    onEdit={tableActions.handleEdit}
                    onDelete={tableActions.openDeleteDialog}
                    copyIdLabel="Copiar ID de rol"
                />
            );
        },
    },
];

export default function RolesPage() {
    const {
        data: roles,
        isLoading,
        tableState,
        totalPages,
        totalRecords,
        setPage,
        setPageSize,
        setSearch,
        setSorting,
        refresh,
    } = useServerTable<RoleList>({
        endpoint: BACKEND_ROUTES.urlRoles,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<RoleList>({
        resourceName: "rol",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlRoles}/${id}`,
        editRoute: (id) => `/admin/roles/${id}/edit`,
        detailRoute: (id) => `/admin/roles/${id}`,
        onDeleteSuccess: refresh,
    });

    const columns = createColumns(tableActions);

    return (
        <div className="container mx-auto p-4 md:py-10">
            <div className="mb-6 flex items-center w-full justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
                    <p className="text-muted-foreground">
                        Visualiza y gestiona los roles del sistema
                    </p>
                </div>
                <BtnLink
                    data={{
                        href: `${CLIENT_ROUTES.urlRoles}/create`,
                        Icon: Plus,
                        name: "Crear Rol"
                    }} />
            </div>

            <DataTable
                columns={columns}
                data={roles}
                isLoading={isLoading}
                searchPlaceholder="Buscar por nombre o descripción..."
                currentPage={tableState.page}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={tableState.pageSize}
                searchValue={tableState.search}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onSearchChange={setSearch}
                onSortingChange={setSorting}
                pageSizeOptions={[10, 15, 25, 50]}
            />

            <DeleteConfirmationDialog
                open={tableActions.isDeleteDialogOpen}
                onOpenChange={tableActions.closeDeleteDialog}
                onConfirm={tableActions.handleDelete}
                title="¿Eliminar rol?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el rol del sistema. Los usuarios con este rol perderán sus permisos asociados."
                itemName={tableActions.itemToDelete?.nombre}
                isLoading={tableActions.isDeleting}
            />
        </div>
    );
}