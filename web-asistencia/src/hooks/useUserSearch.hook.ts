import { useState, useEffect, useRef, useCallback } from "react";
import { useClientApi } from "./useClientApi.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { PaginatedResponse, UserList } from "@/interfaces";


interface UseUserSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useUserSearch(options: UseUserSearchOptions = {}) {
  const { enabled = true, debounceMs = 350 } = options;
  const { get } = useClientApi(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Limpiar timeout anterior
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    const fetchUsers = async (searchQuery?: string) => {
      setLoading(true);
      setError(null);

      try {
        const url = searchQuery && searchQuery.trim().length > 0 ? `${BACKEND_ROUTES.urlUsuarios}?search=${encodeURIComponent(searchQuery)}` : BACKEND_ROUTES.urlUsuarios;

        const response = await get<PaginatedResponse<UserList>>(url);

        if (response.data && typeof response.data === "object" && "records" in response.data) {
          setResults((response.data as PaginatedResponse<UserList>).records);
        } else {
          setResults([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar usuarios");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Si no hay query, fetch inmediato. Si hay query, debounce
    if (!query || query.trim().length === 0) {
      void fetchUsers();
    } else {
      debounceRef.current = window.setTimeout(() => {
        void fetchUsers(query);
      }, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [query, enabled, debounceMs, get]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch,
  };
}
