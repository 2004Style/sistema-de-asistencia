"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { ensureArray, getErrorMessage } from "@/utils";
import { TurnosList } from "@/interfaces";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Plus } from "lucide-react";
import Link from "next/link";
import BtnLink from "@/components/btn-link";
import { CLIENT_ROUTES } from "@/routes/client.routes";

// Columnas para la tabla de turnos (según TurnosList)
const createColumns = (tableActions: ReturnType<typeof useTableActions<TurnosList>>): ColumnDef<TurnosList>[] => [
    {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column} title="ID" />,
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("id")}</div>,
        size: 60,
    },
    {
        accessorKey: "nombre",
        header: ({ column }) => <SortableHeader column={column} title="Nombre" />,
        cell: ({ row }) => (
            <div>
                <div className="font-medium">{row.getValue("nombre")}</div>
                <div className="text-xs text-muted-foreground">{row.original.descripcion}</div>
            </div>
        ),
    },
    {
        accessorKey: "hora_inicio",
        header: "Inicio",
        cell: ({ row }) => {
            const v = row.getValue("hora_inicio") as string;
            return <div className="font-mono">{v}</div>;
        },
    },
    {
        accessorKey: "hora_fin",
        header: "Fin",
        cell: ({ row }) => {
            const v = row.getValue("hora_fin") as string;
            return <div className="font-mono">{v}</div>;
        },
    },
    {
        accessorKey: "duracion_horas",
        header: "Duración (h)",
        cell: ({ row }) => {
            const v = row.getValue("duracion_horas") as number;
            return <div className="font-mono">{v}</div>;
        },
    },
    {
        accessorKey: "es_turno_nocturno",
        header: "Nocturno",
        cell: ({ row }) => {
            const v = row.getValue("es_turno_nocturno") as boolean;
            return (
                <Badge variant={v ? "default" : "secondary"} className="gap-1">{v ? "Sí" : "No"}</Badge>
            );
        },
    },
    {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => {
            const activo = row.getValue("activo") as boolean;
            return (
                <Badge variant={activo ? "default" : "destructive"} className="gap-1">{activo ? "Sí" : "No"}</Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Acciones",
        enableHiding: false,
        cell: ({ row }) => {
            const item = row.original;
            return (
                <TableActionsMenu
                    item={item}
                    onCopyId={tableActions.handleCopyId}
                    onViewDetails={tableActions.handleViewDetails}
                    onEdit={tableActions.handleEdit}
                    onDelete={tableActions.openDeleteDialog}
                    copyIdLabel="Copiar ID de turno"
                />
            );
        },
    },
];

export default function TurnosPage() {
    const {
        data: turnos,
        isLoading,
        tableState,
        totalPages,
        totalRecords,
        setPage,
        setPageSize,
        setSearch,
        setSorting,
        refresh,
    } = useServerTable<TurnosList>({
        endpoint: BACKEND_ROUTES.urlTurnos,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<TurnosList>({
        resourceName: "turno",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlTurnos}/${id}`,
        editRoute: (id) => `/admin/turnos/${id}/edit`,
        detailRoute: (id) => `/admin/turnos/${id}`,
        onDeleteSuccess: refresh,
    });

    const columns = createColumns(tableActions);

    return (
        <div className="container mx-auto p-4 md:py-10">
            <div className="mb-6 flex items-center w-full justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Turnos</h1>
                    <p className="text-muted-foreground">Visualiza y gestiona los turnos del sistema</p>
                </div>
                <BtnLink
                    data={{
                        href: `${CLIENT_ROUTES.urlTurnos}/create`,
                        Icon: Plus,
                        name: "Crear Turno"
                    }} />
            </div>

            <DataTable
                columns={columns}
                data={turnos ?? []}
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
                title="¿Eliminar turno?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el turno del sistema."
                itemName={tableActions.itemToDelete?.nombre || ""}
                isLoading={tableActions.isDeleting}
            />
        </div>
    );
}