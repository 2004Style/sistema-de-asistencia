"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { ResportesList } from "@/interfaces";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Plus } from "lucide-react";
import Link from "next/link";

// Definición de columnas para la tabla de reportes
const createColumns = (tableActions: ReturnType<typeof useTableActions<ResportesList>>): ColumnDef<ResportesList>[] => [
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
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("nombre")}</div>
        ),
    },
    {
        accessorKey: "ruta",
        header: ({ column }) => <SortableHeader column={column} title="Ruta" />,
        cell: ({ row }) => (
            <div className="font-medium truncate max-w-xs">{row.getValue("ruta")}</div>
        ),
    },
    {
        accessorKey: "tipo",
        header: ({ column }) => <SortableHeader column={column} title="Tipo" />,
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("tipo")}</div>
        ),
    },
    {
        accessorKey: "formato",
        header: ({ column }) => <SortableHeader column={column} title="Formato" />,
        cell: ({ row }) => {
            const formato = row.getValue("formato") as string;
            return (
                <Badge className="gap-1">{formato?.toUpperCase()}</Badge>
            );
        },
    },
    {
        accessorKey: "tamano",
        header: ({ column }) => <SortableHeader column={column} title="Tamaño (bytes)" />,
        cell: ({ row }) => {
            const tamano = row.getValue("tamano") as number;
            return (
                <div className="font-medium">{tamano ?? 0}</div>
            );
        },
    },
    {
        accessorKey: "fecha_creacion",
        header: ({ column }) => <SortableHeader column={column} title="Fecha Creación" />,
        cell: ({ row }) => {
            const fecha = row.getValue("fecha_creacion") as string;
            return (
                <div className="font-medium text-xs">{fecha}</div>
            );
        },
    },
    {
        accessorKey: "url_descarga",
        header: ({ column }) => <SortableHeader column={column} title="URL Descarga" />,
        cell: ({ row }) => {
            const url = row.getValue("url_descarga") as string;
            return (
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-foreground underline">Abrir</a>
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
                    copyIdLabel="Copiar ID de reporte"
                />
            );
        },
    },
];

export default function ReportesPage() {
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
    } = useServerTable<ResportesList>({
        endpoint: BACKEND_ROUTES.urlReportesList,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<ResportesList>({
        resourceName: "reporte",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlReportesList}/${id}`,
        editRoute: (id) => `/admin/reporte/${id}/edit`,
        detailRoute: (id) => `/admin/reporte/${id}`,
        onDeleteSuccess: refresh,
    });

    const columns = createColumns(tableActions);

    return (
        <div className="container mx-auto py-6 px-4 md:py-10">
            <div className="mb-6 flex items-center w-full justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Horarios</h1>
                    <p className="text-muted-foreground">
                        Visualiza y gestiona los horarios del sistema
                    </p>
                </div>
                <Link href="#" className="flex gap-3 bg-foreground text-background px-3 py-2 rounded-md">
                    <Plus />
                    <span>Crear Horario</span>
                </Link>
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
                title="¿Eliminar reporte?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el reporte del sistema."
                itemName={tableActions.itemToDelete?.nombre || tableActions.itemToDelete?.id || ""}
                isLoading={tableActions.isDeleting}
            />
        </div>
    );
}