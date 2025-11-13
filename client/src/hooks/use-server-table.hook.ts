"use client";

import { useCallback, useEffect, useState } from "react";
import { PaginatedResponse, TableQueryParams, TableState } from "@/interfaces/table.interface";
import { useClientApi } from "./useClientApi.hook";
import { toast } from "sonner";

interface UseServerTableOptions {
  endpoint: string;
  initialPageSize?: number;
  initialSearch?: string;
  debounceMs?: number;
}

interface UseServerTableReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  tableState: TableState;
  totalPages: number;
  totalRecords: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => void;
  refresh: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook genérico para tablas con paginación del servidor
 * Maneja búsqueda, ordenamiento y paginación desde el backend
 */
export function useServerTable<T>(options: UseServerTableOptions, isPrivate: boolean = true): UseServerTableReturn<T> {
  const { endpoint, initialPageSize = 10, initialSearch = "", debounceMs = 500 } = options;

  const { GET } = useClientApi(isPrivate);

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [tableState, setTableState] = useState<TableState>({
    page: 1,
    pageSize: initialPageSize,
    search: initialSearch,
  });

  // Debounce para la búsqueda
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: TableQueryParams = {
        page: tableState.page,
        pageSize: tableState.pageSize,
        search: tableState.search,
        sortBy: tableState.sortBy,
        sortOrder: tableState.sortOrder,
      };

      // Construir URL con parámetros
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      const url = `${endpoint}?${queryString}`;
      const { data, alert } = await GET<PaginatedResponse<T>>(url);

      if (alert === "error" || !data) {
        throw new Error("Error al obtener los datos");
      }

      setData(data.records);
      setTotalPages(data.totalPages);
      setTotalRecords(data.totalRecords);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error(errorMessage);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, tableState, GET]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = useCallback((page: number) => {
    setTableState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setTableState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSearch = useCallback(
    (search: string) => {
      // Limpiar timeout anterior
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }

      // Crear nuevo timeout para debounce
      const timeout = setTimeout(() => {
        setTableState((prev) => ({ ...prev, search, page: 1 }));
      }, debounceMs);

      setSearchDebounce(timeout);
    },
    [debounceMs, searchDebounce]
  );

  const setSorting = useCallback((sortBy: string, sortOrder: "asc" | "desc") => {
    setTableState((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    tableState,
    totalPages,
    totalRecords,
    setPage,
    setPageSize,
    setSearch,
    setSorting,
    refresh,
    hasNextPage: tableState.page < totalPages,
    hasPreviousPage: tableState.page > 1,
  };
}
