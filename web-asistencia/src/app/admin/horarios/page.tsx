"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { HorariosList } from "@/interfaces";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Plus } from "lucide-react";
import Link from "next/link";

// Definición de columnas para la tabla de horarios
const createColumns = (tableActions: ReturnType<typeof useTableActions<HorariosList>>): ColumnDef<HorariosList>[] => [
    {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column} title="ID" />,
        cell: ({ row }) => (
            <div className="font-mono text-xs">{row.getValue("id")}</div>
        ),
    },
    {
        accessorKey: "dia_semana",
        header: ({ column }) => <SortableHeader column={column} title="Día de la Semana" />,
        cell: ({ row }) => {
            return (
                <div>
                    <div className="font-medium">{row.getValue("dia_semana")}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.dia_semana}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "turno_nombre",
        header: ({ column }) => <SortableHeader column={column} title="Turno" />,
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("turno_nombre")}</div>
        ),
    },
    {
        accessorKey: "turno_id",
        header: "ID Turno",
        cell: ({ row }) => {
            const turnoId = row.getValue("turno_id") as number;
            return (
                <div className="font-medium">{turnoId}</div>
            );
        },
    },
    {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => {
            const descripcion = row.getValue("descripcion") as string | undefined;
            return (
                <div className="font-medium">{descripcion ?? "-"}</div>
            );
        },
    },
    {
        accessorKey: "hora_entrada",
        header: "Hora de Entrada",
        cell: ({ row }) => {
            const horaEntrada = row.getValue("hora_entrada") as string;
            return (
                <div className="font-medium">{horaEntrada}</div>
            );
        },
    },
    {
        accessorKey: "hora_salida",
        header: "Hora de Salida",
        cell: ({ row }) => {
            const horaSalida = row.getValue("hora_salida") as string;
            return (
                <div className="font-medium">{horaSalida}</div>
            );
        },
    },
    {
        accessorKey: "horas_requeridas",
        header: "Horas Requeridas",
        cell: ({ row }) => {
            const horasRequeridas = row.getValue("horas_requeridas") as number;
            return (
                <div className="font-medium">{horasRequeridas}</div>
            );
        },
    },
    {
        accessorKey: "tolerancia_entrada",
        header: "Tolerancia Entrada",
        cell: ({ row }) => {
            const toleranciaEntrada = row.getValue("tolerancia_entrada") as number;
            return (
                <div className="font-medium">{toleranciaEntrada}</div>
            );
        },
    },
    {
        accessorKey: "tolerancia_salida",
        header: "Tolerancia Salida",
        cell: ({ row }) => {
            const toleranciaSalida = row.getValue("tolerancia_salida") as number;
            return (
                <div className="font-medium">{toleranciaSalida}</div>
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
        accessorKey: "created_at",
        header: "Fecha de Creación",
        cell: ({ row }) => {
            const createdAt = row.getValue("created_at") as string;
            return (
                <div className="font-medium">{createdAt}</div>
            );
        },
    },
    {
        accessorKey: "updated_at",
        header: "Fecha de Actualización",
        cell: ({ row }) => {
            const updatedAt = row.getValue("updated_at") as string;
            return (
                <div className="font-medium">{updatedAt ? updatedAt : "No disponible"}</div>
            );
        },
    },
    {
        accessorKey: "user_id",
        header: "ID de Usuario",
        cell: ({ row }) => {
            const userId = row.getValue("user_id") as number;
            return (
                <div className="font-medium">{userId}</div>
            );
        },
    },
    {
        accessorKey: "usuario_nombre",
        header: "Nombre Usuario",
        cell: ({ row }) => {
            const nombre = row.getValue("usuario_nombre") as string;
            return (
                <div className="font-medium">{nombre}</div>
            );
        },
    },
    {
        accessorKey: "usuario_email",
        header: "Email Usuario",
        cell: ({ row }) => {
            const email = row.getValue("usuario_email") as string;
            return (
                <div className="font-medium">{email}</div>
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
                    copyIdLabel="Copiar ID de horario"
                />
            );
        },
    },
];

export default function HorariosPage() {
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
    } = useServerTable<HorariosList>({
        endpoint: BACKEND_ROUTES.urlHorarios,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<HorariosList>({
        resourceName: "horario",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlHorarios}/${id}`,
        editRoute: (id) => `/admin/horarios/${id}/edit`,
        detailRoute: (id) => `/admin/horarios/${id}`,
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
                title="¿Eliminar horario?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el horario del sistema."
                itemName={tableActions.itemToDelete?.dia_semana || ""}
                isLoading={tableActions.isDeleting}
            />
        </div>
    );
}