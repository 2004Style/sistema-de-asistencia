"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClientApi } from "./useClientApi.hook";

interface UseTableActionsProps<T> {
  resourceName: string; // "usuario", "asistencia", "rol"
  deleteEndpoint?: (id: number) => string;
  editRoute?: (id: string | number) => string;
  detailRoute?: (id: string | number) => string;
  onDeleteSuccess?: () => void;
  customActions?: {
    [key: string]: (item: T) => void | Promise<void>; // Acciones personalizadas adicionales
  };
}

export function useTableActions<T extends { id: string | number }>({ resourceName, deleteEndpoint, editRoute, detailRoute, onDeleteSuccess, customActions = {} }: UseTableActionsProps<T>) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const { DELETE } = useClientApi();

  // Abrir modal de confirmación de eliminación
  const openDeleteDialog = (item: T) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  // Cerrar modal de confirmación
  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Ejecutar eliminación
  const handleDelete = async () => {
    if (!itemToDelete || !deleteEndpoint) return;

    setIsDeleting(true);
    try {
      const { alert } = await DELETE(deleteEndpoint(Number(itemToDelete.id)));
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      alert === "success"
        ? toast.success(`${resourceName} eliminado correctamente`, {
            description: `El ${resourceName} ha sido eliminado exitosamente.`,
          })
        : new Error(`Error al eliminar ${resourceName}`);

      closeDeleteDialog();
      onDeleteSuccess?.();
    } catch (error) {
      toast.error(`Error al eliminar ${resourceName}`, {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Navegar a edición
  const handleEdit = (item: T) => {
    if (editRoute) {
      router.replace(editRoute(item.id));
    }
  };

  // Navegar a detalles
  const handleViewDetails = (item: T) => {
    if (detailRoute) {
      router.replace(detailRoute(item.id));
    }
  };

  // Copiar ID al portapapeles
  const handleCopyId = (id: string | number) => {
    navigator.clipboard.writeText(String(id));
    toast.success("ID copiado", {
      description: "El ID ha sido copiado al portapapeles.",
    });
  };

  // Crear función de navegación personalizada
  const createNavigateAction = (routeFactory: (item: T) => string) => {
    return (item: T) => {
      router.replace(routeFactory(item));
    };
  };

  // Ejecutar acción personalizada
  const executeCustomAction = async (actionKey: string, item: T) => {
    const action = customActions[actionKey];
    if (action) {
      try {
        await action(item);
      } catch (error) {
        toast.error("Error al ejecutar acción", {
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        });
      }
    }
  };

  return {
    // Estado
    isDeleteDialogOpen,
    isDeleting,
    itemToDelete,

    // Acciones
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
    handleEdit,
    handleViewDetails,
    handleCopyId,
    createNavigateAction,
    executeCustomAction,
  };
}
