"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { useJustificacionesApi } from "@/hooks/useJustificacionesApi.hook";
import { useSession } from "next-auth/react";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { JustificacionList } from "@/interfaces";
import { ensureArray, getErrorMessage } from "@/utils";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { ActionsDialog } from "./actions-dialog";
import {
    Plus,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2,
} from "lucide-react";

// Columnas para la tabla de justificaciones (basadas en JustificacionList)
const createColumns = (
    tableActions: ReturnType<typeof useTableActions<JustificacionList>>
): ColumnDef<JustificacionList>[] => [
        {
            accessorKey: "id",
            header: ({ column }) => <SortableHeader column={column} title="ID" />,
            cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("id")}</div>,
            size: 60,
        },
        {
            accessorKey: "usuario_nombre",
            header: ({ column }) => <SortableHeader column={column} title="Usuario" />,
            cell: ({ row }) => {
                const nombre = row.getValue("usuario_nombre") as string | undefined;
                const email = row.original.usuario_email as string | undefined;
                return (
                    <div className="flex flex-col">
                        <div className="font-medium text-sm truncate">{nombre ?? "-"}</div>
                        {email ? <div className="text-xs text-muted-foreground">{email}</div> : null}
                    </div>
                );
            },
            minSize: 160,
        },
        {
            accessorKey: "user_id",
            header: "ID Usuario",
            cell: ({ row }) => {
                const id = row.getValue("user_id") as number | undefined;
                return id == null ? <span className="text-xs text-muted-foreground">-</span> : <div className="font-mono text-sm">{id}</div>;
            },
        },
        {
            accessorKey: "fecha_inicio",
            header: ({ column }) => <SortableHeader column={column} title="Inicio" />,
            cell: ({ row }) => {
                const val = row.getValue("fecha_inicio") as string | undefined;
                if (!val) return <span className="text-xs text-muted-foreground">-</span>;
                const d = new Date(val);
                return <div className="text-sm">{d.toLocaleDateString("es-ES")}</div>;
            },
        },
        {
            accessorKey: "fecha_fin",
            header: ({ column }) => <SortableHeader column={column} title="Fin" />,
            cell: ({ row }) => {
                const val = row.getValue("fecha_fin") as string | undefined;
                if (!val) return <span className="text-xs text-muted-foreground">-</span>;
                const d = new Date(val);
                return <div className="text-sm">{d.toLocaleDateString("es-ES")}</div>;
            },
        },
        {
            accessorKey: "tipo",
            header: "Tipo",
            cell: ({ row }) => {
                const tipo = row.getValue("tipo") as string | undefined;
                return tipo ? <Badge variant="outline" className="text-xs">{tipo}</Badge> : <span className="text-xs text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: "motivo",
            header: "Motivo",
            cell: ({ row }) => {
                const m = row.getValue("motivo") as string | undefined;
                return m ? <div className="text-sm truncate max-w-xs" title={m}>{m}</div> : <span className="text-xs text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: "documento_url",
            header: "Documento",
            cell: ({ row }) => {
                const url = row.getValue("documento_url") as string | undefined;
                return url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Ver</a>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: "dias_justificados",
            header: "Días",
            cell: ({ row }) => {
                const dias = row.getValue("dias_justificados") as number | undefined;
                return dias == null ? <span className="text-xs text-muted-foreground">-</span> : <div className="font-mono">{dias}</div>;
            },
        },
        {
            accessorKey: "estado",
            header: "Estado",
            cell: ({ row }) => {
                const estado = row.getValue("estado") as string | undefined;
                const map: Record<string, { label: string; variant: any; icon: any }> = {
                    pendiente: { label: "Pendiente", variant: "secondary", icon: FileText },
                    aprobada: { label: "Aprobada", variant: "default", icon: CheckCircle2 },
                    rechazada: { label: "Rechazada", variant: "destructive", icon: XCircle },
                };
                const cfg = estado ? (map[estado] ?? { label: estado, variant: "outline", icon: FileText }) : null;
                if (!cfg) return <span className="text-xs text-muted-foreground">-</span>;
                const Icon = cfg.icon ?? FileText;
                return (
                    <Badge variant={cfg.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "aprobado_por",
            header: "Aprobado por",
            cell: ({ row }) => {
                const ap = row.getValue("aprobado_por") as string | null;
                return ap ? <div className="text-sm">{ap}</div> : <span className="text-xs text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: "fecha_revision",
            header: "Fecha revisión",
            cell: ({ row }) => {
                const val = row.getValue("fecha_revision") as string | null;
                if (!val) return <span className="text-xs text-muted-foreground">-</span>;
                const d = new Date(val);
                return <div className="text-xs">{d.toLocaleString("es-ES")}</div>;
            },
        },
        {
            accessorKey: "comentario_revisor",
            header: "Comentario revisor",
            cell: ({ row }) => {
                const c = row.getValue("comentario_revisor") as string | null;
                return c ? <div className="text-sm truncate max-w-xs" title={c}>{c}</div> : <span className="text-xs text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: "revisor_nombre",
            header: "Revisor",
            cell: ({ row }) => {
                const r = row.getValue("revisor_nombre") as string | null;
                return r ? <div className="text-sm">{r}</div> : <span className="text-xs text-muted-foreground">-</span>;
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
                const val = row.getValue("updated_at") as string | null;
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
                const item = row.original;
                return (
                    <div className="flex gap-2">
                        <TableActionsMenu
                            item={item}
                            onCopyId={tableActions.handleCopyId}
                            onViewDetails={tableActions.handleViewDetails}
                            onEdit={tableActions.handleEdit}
                            onDelete={tableActions.openDeleteDialog}
                            copyIdLabel="Copiar ID de justificación"
                        />
                    </div>
                );
            },
        },
    ];

export default function JustificacionesPage() {
    const { data: session } = useSession();
    const { refresh: refreshTable } = useServerTable<JustificacionList>({
        endpoint: BACKEND_ROUTES.urlJustificaciones,
        initialPageSize: 15,
    });

    const {
        data: justificaciones,
        isLoading,
        tableState,
        totalPages,
        totalRecords,
        setPage,
        setPageSize,
        setSearch,
        setSorting,
        refresh,
    } = useServerTable<JustificacionList>({
        endpoint: BACKEND_ROUTES.urlJustificaciones,
        initialPageSize: 15,
    });

    const tableActions = useTableActions<JustificacionList>({
        resourceName: "justificacion",
        deleteEndpoint: (id) => `${BACKEND_ROUTES.urlJustificaciones}/${id}`,
        editRoute: (id) => `/admin/justificaciones/${id}/edit`,
        detailRoute: (id) => `/admin/justificaciones/${id}`,
        onDeleteSuccess: refresh,
    });

    // Estado para los diálogos de aprobación/rechazo
    const [selectedJustificacion, setSelectedJustificacion] = useState<JustificacionList | null>(null);
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleApprove = (justificacion: JustificacionList) => {
        setSelectedJustificacion(justificacion);
        setActionType("approve");
        setIsDialogOpen(true);
    };

    const handleReject = (justificacion: JustificacionList) => {
        setSelectedJustificacion(justificacion);
        setActionType("reject");
        setIsDialogOpen(true);
    };

    const createColumnsWithActions = (): ColumnDef<JustificacionList>[] => {
        const baseColumns = createColumns(tableActions);
        // Reemplazar la columna de acciones con una que incluya approve/reject
        return baseColumns.map((col) => {
            if (col.id === "actions") {
                return {
                    id: "actions",
                    header: "Acciones",
                    enableHiding: false,
                    cell: ({ row }) => {
                        const item = row.original;
                        const isPendiente = item.estado === "pendiente";

                        return (
                            <div className="flex gap-1">
                                {isPendiente && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleApprove(item)}
                                            title="Aprobar"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleReject(item)}
                                            title="Rechazar"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                                <TableActionsMenu
                                    item={item}
                                    onCopyId={tableActions.handleCopyId}
                                    onViewDetails={tableActions.handleViewDetails}
                                    onEdit={tableActions.handleEdit}
                                    onDelete={tableActions.openDeleteDialog}
                                    copyIdLabel="Copiar ID de justificación"
                                />
                            </div>
                        );
                    },
                } as ColumnDef<JustificacionList>;
            }
            return col;
        });
    };

    const columns = createColumnsWithActions();

    return (
        <div className="container mx-auto p-4 md:py-10">
            <div className="mb-6 flex items-center w-full justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Justificaciones</h1>
                    <p className="text-muted-foreground">Visualiza y gestiona las justificaciones del sistema</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={justificaciones}
                isLoading={isLoading}
                searchPlaceholder="Buscar por usuario, motivo o estado..."
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
                title="¿Eliminar justificación?"
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente la justificación."
                itemName={tableActions.itemToDelete?.usuario_nombre || ""}
                isLoading={tableActions.isDeleting}
            />

            {/* Dialog para aprobar/rechazar */}
            <ActionsDialog
                justificacion={selectedJustificacion}
                action={actionType}
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={refresh}
            />
        </div>
    );
}