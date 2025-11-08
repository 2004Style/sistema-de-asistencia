"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { AsistenciaList } from "@/interfaces";
import { ensureArray, getErrorMessage } from "@/utils";
import { CheckCircle2, Clock, XCircle, FileText, Plus } from "lucide-react";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// Definición de columnas para la tabla de asistencias
const createColumns = (
    tableActions: ReturnType<typeof useTableActions<AsistenciaList>>
): ColumnDef<AsistenciaList>[] => [
        {
            accessorKey: "id",
            header: ({ column }) => <SortableHeader column={column} title="ID" />,
            cell: ({ row }) => (
                <div className="font-mono text-xs">{row.getValue("id")}</div>
            ),
            size: 60,
        },
        {
            accessorKey: "nombre_usuario",
            header: ({ column }) => <SortableHeader column={column} title="Usuario" />,
            cell: ({ row }) => {
                const nombre = row.getValue("nombre_usuario") as string | undefined;
                const codigo = row.original.codigo_usuario;
                const email = row.original.email_usuario;

                return (
                    <div className="flex flex-col">
                        <div className="font-medium text-sm truncate">{nombre ?? "-"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-mono">{codigo ?? ""}</span>
                            {email ? <span className="hidden sm:inline">· {email}</span> : null}
                        </div>
                    </div>
                );
            },
            minSize: 180,
        },
        {
            accessorKey: "user_id",
            header: "ID Usuario",
            cell: ({ row }) => {
                const id = row.getValue("user_id") as number | undefined;
                return id == null ? (
                    <span className="text-xs text-muted-foreground">-</span>
                ) : (
                    <div className="font-mono text-sm">{id}</div>
                );
            },
        },
        {
            accessorKey: "horario_id",
            header: "ID Horario",
            cell: ({ row }) => {
                const id = row.getValue("horario_id") as number | undefined;
                return id == null ? (
                    <span className="text-xs text-muted-foreground">-</span>
                ) : (
                    <div className="font-mono text-sm">{id}</div>
                );
            },
        },
        {
            accessorKey: "fecha",
            header: ({ column }) => <SortableHeader column={column} title="Fecha" />,
            cell: ({ row }) => {
                const fechaVal = row.getValue("fecha") as string | undefined;
                if (!fechaVal) return <span className="text-xs text-muted-foreground">-</span>;
                const date = new Date(fechaVal);
                return (
                    <div className="text-sm">
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
            accessorKey: "hora_entrada",
            header: "Entrada",
            cell: ({ row }) => {
                const checkIn = row.getValue("hora_entrada") as string | undefined;
                return checkIn ? (
                    <Badge variant="outline" className="gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {checkIn}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "hora_salida",
            header: "Salida",
            cell: ({ row }) => {
                const checkOut = row.getValue("hora_salida") as string | undefined;
                return checkOut ? (
                    <Badge variant="outline" className="gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {checkOut}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "metodo_entrada",
            header: "Método entrada",
            cell: ({ row }) => {
                const metodo = row.getValue("metodo_entrada") as string | undefined;
                return metodo ? (
                    <Badge variant="secondary" className="text-xs">{metodo}</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "metodo_salida",
            header: "Método salida",
            cell: ({ row }) => {
                const metodo = row.getValue("metodo_salida") as string | undefined;
                return metodo ? (
                    <Badge variant="secondary" className="text-xs">{metodo}</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "estado",
            header: "Estado",
            cell: ({ row }) => {
                const status = row.getValue("estado") as AsistenciaList['estado'] | string;

                const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
                    presente: { label: "Presente", variant: "default", icon: CheckCircle2 },
                    tarde: { label: "Tarde", variant: "secondary", icon: Clock },
                    ausente: { label: "Ausente", variant: "destructive", icon: XCircle },
                    justificado: { label: "Justificado", variant: "secondary", icon: CheckCircle2 },
                    permiso: { label: "Permiso", variant: "secondary", icon: CheckCircle2 },
                };

                const defaultConfig = { label: String(status ?? "-"), variant: "outline", icon: FileText };
                const config = statusConfig[String(status)] ?? defaultConfig;
                const Icon = config.icon ?? FileText;

                return (
                    <Badge variant={config.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "tardanza",
            header: "Tardanza",
            cell: ({ row }) => {
                const tardanza = row.getValue("tardanza") as boolean;
                return tardanza ? (
                    <Badge variant="destructive" className="text-xs">Sí</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">No</span>
                );
            },
        },
        {
            accessorKey: "minutos_tardanza",
            header: "Min. tarde",
            cell: ({ row }) => {
                const mins = row.getValue("minutos_tardanza") as number | null;
                return mins == null ? (
                    <span className="text-xs text-muted-foreground">-</span>
                ) : (
                    <div className="font-mono text-sm">{mins} min</div>
                );
            },
        },
        {
            accessorKey: "minutos_trabajados",
            header: "Min. trabaj.",
            cell: ({ row }) => {
                const mins = row.getValue("minutos_trabajados") as number | undefined;
                return mins == null ? (
                    <span className="text-xs text-muted-foreground">-</span>
                ) : (
                    <div className="font-mono text-sm">{mins} min</div>
                );
            },
        },
        {
            accessorKey: "horas_trabajadas_formato",
            header: "Horas trabajadas",
            cell: ({ row }) => {
                const hfmt = row.getValue("horas_trabajadas_formato") as string | undefined;
                return hfmt ? (
                    <div className="font-mono text-sm">{hfmt}</div>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "justificacion_id",
            header: "Justificación",
            cell: ({ row }) => {
                const j = row.getValue("justificacion_id") as number | null;
                return j == null ? (
                    <span className="text-xs text-muted-foreground">-</span>
                ) : (
                    <div className="font-mono text-sm">#{j}</div>
                );
            },
        },
        {
            accessorKey: "observaciones",
            header: "Observaciones",
            cell: ({ row }) => {
                const obs = row.getValue("observaciones") as string;
                return obs ? (
                    <div className="text-sm truncate max-w-xs" title={obs}>{obs}</div>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "codigo_usuario",
            header: "C digo usuario",
            cell: ({ row }) => {
                const codigo = row.getValue("codigo_usuario") as string | undefined;
                return codigo ? (
                    <div className="font-mono text-sm">{codigo}</div>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "email_usuario",
            header: "Email usuario",
            cell: ({ row }) => {
                const email = row.getValue("email_usuario") as string | undefined;
                return email ? (
                    <div className="text-sm truncate max-w-xs">{email}</div>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "es_manual",
            header: "Origen",
            cell: ({ row }) => {
                const manual = row.getValue("es_manual") as boolean;
                return manual ? (
                    <Badge variant="outline">Manual</Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">Automático</span>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Creado",
            cell: ({ row }) => {
                const val = row.getValue("created_at") as string | undefined;
                if (!val) return <span className="text-xs text-muted-foreground">-</span>;
                const d = new Date(val);
                return <div className="text-xs">{d.toLocaleString("es-ES")}</div>;
            },
        },
        {
            accessorKey: "updated_at",
            header: "Actualizado",
            cell: ({ row }) => {
                const val = row.getValue("updated_at") as string | undefined;
                if (!val) return <span className="text-xs text-muted-foreground">-</span>;
                const d = new Date(val);
                return <div className="text-xs">{d.toLocaleString("es-ES")}</div>;
            },
        },
        {
            id: "actions",
            header: "Acciones",
            enableHiding: false,
            cell: ({ row }) => {
                const asistencia = row.original;

                // Acciones extra condicionales
                const extraActions = [
                    {
                        label: "Ver notas",
                        onClick: (item: AsistenciaList) => {
                            // TODO: Implementar vista de notas
                            console.log("Ver notas", item.observaciones);
                        },
                        icon: <FileText className="h-4 w-4" />,
                        show: (item: AsistenciaList) => !!item.observaciones, // Solo si existen notas
                    },
                ];

                return (
                    <TableActionsMenu
                        item={asistencia}
                        onCopyId={tableActions.handleCopyId}
                        onViewDetails={tableActions.handleViewDetails}
                        onEdit={tableActions.handleEdit}
                        onDelete={tableActions.openDeleteDialog}
                        copyIdLabel="Copiar ID de asistencia"
                        extraActions={extraActions}
                    />
                );
            },
        },
    ];

export default function AsistenciasPage() {
    const {
        data: asistencias,
        isLoading,
        tableState,
        totalPages,
        totalRecords,
        setPage,
        setPageSize,
        setSearch,
        setSorting,
        refresh,
    } = useServerTable<AsistenciaList>({
        endpoint: BACKEND_ROUTES.urlAsistencias,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<AsistenciaList>({
        resourceName: "asistencia",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlAsistencias}/${id}`,
        editRoute: (id) => `/admin/asistencias/${id}/edit`,
        detailRoute: (id) => `/admin/asistencias/${id}`,
        onDeleteSuccess: refresh,
    });

    const columns = createColumns(tableActions);

    return (
        <div className="container mx-auto p-4 md:py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Asistencias</h1>
                <p className="text-muted-foreground">
                    Visualiza y gestiona los registros de asistencia del sistema
                </p>
            </div>

            <DataTable
                columns={columns}
                data={asistencias}
                isLoading={isLoading}
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
                title="¿Eliminar registro de asistencia?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de asistencia."
                itemName={tableActions.itemToDelete ? `Asistencia de ${tableActions.itemToDelete.user_id}` : undefined}
                isLoading={tableActions.isDeleting}
            />
        </div>
    );
}
