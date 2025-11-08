"use client";

import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

// ============================================
// TIPOS E INTERFACES
// ============================================

/**
 * Tipos de alerta para respuestas
 */
export type AlertType = "success" | "error" | "warning" | "info";

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T = unknown> {
  alert: AlertType;
  data?: T;
  message?: string;
  detail?: string;
  statusCode?: number;
}

/**
 * Métodos HTTP soportados
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Tipos de contenido
 */
export type ContentType = "json" | "form-data";

/**
 * Configuración de petición
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  contentType?: ContentType;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Estado del hook
 */
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  alert: AlertType | null;
}

/**
 * Tokens de autenticación
 */
export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Extrae el mensaje de error de diferentes estructuras
 */
export const MensajeError = (message: unknown): string => {
  let finalMessage = "Ocurrió un error";

  if (typeof message === "string") {
    // Caso 1: mensaje directo
    finalMessage = message;
  } else if (typeof message === "object" && message !== null) {
    const messageObj = message as Record<string, unknown>;
    const innerMessage = messageObj.message || messageObj.detail;

    if (Array.isArray(innerMessage)) {
      // Caso 2: array → tomar solo el primer mensaje
      finalMessage = innerMessage[0] ?? finalMessage;
    } else if (typeof innerMessage === "string") {
      // Caso 3: string dentro del objeto
      finalMessage = innerMessage;
    } else {
      // Caso raro: otro tipo
      finalMessage = JSON.stringify(innerMessage ?? message);
    }
  }

  return finalMessage;
};

/**
 * Variable para evitar múltiples refreshes simultáneos
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Procesa la cola de peticiones fallidas
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Obtiene tokens de Next-Auth Session
 */
const getSessionTokens = async (): Promise<BackendTokens | null> => {
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      return null;
    }

    const session = await response.json();
    if (session?.backendTokens) {
      return session.backendTokens;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Los tokens se manejan automáticamente con Next-Auth
 * Esta función se mantiene por compatibilidad
 */
const saveTokens = (tokens: BackendTokens): void => {};

/**
 * Limpia la sesión (Next-Auth se encarga de esto)
 */
const clearSession = (): void => {
  // Next-Auth maneja la limpieza de sesión automáticamente
};

/**
 * Maneja el fallo del refresh forzando logout
 */
const handleRefreshFailure = async <T = unknown>(baseURL: string): Promise<void> => {
  clearSession();

  try {
    // Llamar a signout de Next-Auth para limpiar la sesión
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
  } catch (error) {
  }
};

/**
 * Refresca el token de autenticación usando Next-Auth
 */
const refreshAuthToken = async (refreshToken: string, baseURL: string): Promise<string | null> => {
  try {
    // Next-Auth maneja el refresh automáticamente
    // Solo obtenemos los nuevos tokens de la sesión
    const tokens = await getSessionTokens();
    return tokens?.accessToken || null;
  } catch (error) {
    return null;
  }
};

/**
 * Crea headers para la petición
 */
const createHeaders = (contentType: ContentType, customHeaders?: Record<string, string>, accessToken?: string): HeadersInit => {
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // No establecer Content-Type para FormData
  if (contentType === "json") {
    headers["Content-Type"] = "application/json";
  }

  // Agregar token de autorización si existe
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
};

/**
 * Procesa el body según el tipo de contenido
 */
const processBody = (body: unknown, contentType: ContentType): BodyInit | undefined => {
  if (!body) return undefined;

  if (contentType === "json") {
    return JSON.stringify(body);
  }

  if (contentType === "form-data") {
    if (body instanceof FormData) {
      return body;
    }

    // Convertir objeto a FormData
    const formData = new FormData();
    Object.entries(body as Record<string, unknown>).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value instanceof Blob) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item instanceof File || item instanceof Blob) {
            formData.append(`${key}[${index}]`, item);
          } else {
            formData.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    return formData;
  }

  return undefined;
};

/**
 * Maneja la respuesta de la API
 */
const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const { status } = response;

  let data: unknown;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const responseData = data as Record<string, unknown>;

  if (status >= 200 && status < 300) {
    return {
      alert: "success",
      data: (responseData?.data as T) || (data as T),
      message: (responseData?.message as string) || "Operación exitosa",
      statusCode: status,
    };
  }

  return {
    alert: "error",
    data: (responseData?.data as T) || undefined,
    message: MensajeError(responseData?.message || data),
    statusCode: status,
  };
};

/**
 * Maneja errores de la petición
 */
const handleApiError = (error: unknown): ApiResponse => {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        alert: "warning",
        message: "La petición fue cancelada",
      };
    }

    if (error.message.includes("timeout")) {
      return {
        alert: "error",
        message: "Tiempo de espera agotado. Verifica tu conexión.",
      };
    }

    if (error.message.includes("Failed to fetch")) {
      return {
        alert: "error",
        message: "Error de conexión. Verifica tu conexión a internet.",
      };
    }

    return {
      alert: "error",
      message: error.message || "Error en la operación",
    };
  }

  return {
    alert: "error",
    message: "Error desconocido",
  };
};

/**
 * Crea un timeout signal
 */
const createTimeoutSignal = (timeout: number, signal?: AbortSignal): AbortSignal => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  return controller.signal;
};

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para realizar peticiones a la API con manejo de autenticación
 *
 * @param baseURL - URL base de la API
 * @param requiresAuth - Si las peticiones requieren autenticación (default: true)
 *
 * @example
 * ```typescript
 * const api = useClientApi();
 *
 * // GET
 * const users = await api.get<User[]>('/api/users');
 *
 * // POST
 * const newUser = await api.post<User>('/api/users', { name: 'John' });
 *
 * // POST con FormData
 * const formData = new FormData();
 * formData.append('file', file);
 * const result = await api.post('/api/upload', formData, { contentType: 'form-data' });
 * ```
 */
export const useClientApi = (requiresAuth: boolean = true, baseURL: string = BACKEND_ROUTES.urlHttpBase || "") => {
  const [state, setState] = useState<ApiState<unknown>>({
    data: null,
    loading: false,
    error: null,
    alert: null,
  });

  /**
   * Realiza una petición HTTP
   */
  const request = useCallback(
    async <T = unknown>(method: HttpMethod, url: string, body?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> => {
      const { headers: customHeaders = {}, contentType = "json", timeout = 30000, signal: externalSignal } = config;

      setState((prev) => ({ ...prev, loading: true, error: null, alert: null }));

      try {
        // Obtener tokens si se requiere autenticación
        let accessToken: string | undefined;
        let refreshToken: string | undefined;

        if (requiresAuth) {
          const tokens = await getSessionTokens();
          if (!tokens) {
            const errorResponse: ApiResponse<T> = {
              alert: "error",
              message: "No se ha autenticado el usuario",
            };

            setState({
              data: null,
              loading: false,
              error: errorResponse.message || null,
              alert: "error",
            });

            return errorResponse;
          }

          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
        }

        // Crear signal con timeout
        const signal = timeout ? createTimeoutSignal(timeout, externalSignal) : externalSignal;

        // Construir URL completa
        const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;

        // Preparar opciones de fetch
        const fetchOptions: RequestInit = {
          method,
          headers: createHeaders(contentType, customHeaders, accessToken),
          signal,
        };

        // Agregar body si existe y el método lo permite
        if (body && ["POST", "PUT", "PATCH"].includes(method)) {
          fetchOptions.body = processBody(body, contentType);
        }

        // Realizar petición
        let response = await fetch(fullUrl, fetchOptions);

        // Manejar refresh de token si es 401
        if (response.status === 401 && requiresAuth && refreshToken && !url.includes("/auth/refresh")) {

          if (isRefreshing) {
            // Esperar a que termine el refresh actual
            try {
              const newToken = await new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
              });

              // Reintentar con nuevo token
              fetchOptions.headers = createHeaders(contentType, customHeaders, newToken);
              response = await fetch(fullUrl, fetchOptions);
            } catch (queueError) {
              // Si falla el refresh en cola, hacer logout
              await handleRefreshFailure<T>(baseURL);
              return {
                alert: "error",
                message: "Sesión expirada. Por favor inicia sesión nuevamente.",
                statusCode: 401,
              };
            }
          } else {
            isRefreshing = true;

            try {
              const newAccessToken = await refreshAuthToken(refreshToken, baseURL);

              if (newAccessToken) {
                processQueue(null, newAccessToken);

                // Reintentar con nuevo token
                fetchOptions.headers = createHeaders(contentType, customHeaders, newAccessToken);
                response = await fetch(fullUrl, fetchOptions);
              } else {
                processQueue(new Error("No se pudo refrescar el token"), null);

                // Hacer logout
                await handleRefreshFailure<T>(baseURL);

                const errorResponse: ApiResponse<T> = {
                  alert: "error",
                  message: "Sesión expirada. Por favor inicia sesión nuevamente.",
                  statusCode: 401,
                };

                setState({
                  data: null,
                  loading: false,
                  error: errorResponse.message || null,
                  alert: "error",
                });

                return errorResponse;
              }
            } catch (error) {
              processQueue(error as Error, null);

              // Hacer logout
              await handleRefreshFailure<T>(baseURL);

              const errorResponse: ApiResponse<T> = {
                alert: "error",
                message: "Sesión expirada. Por favor inicia sesión nuevamente.",
                statusCode: 401,
              };

              setState({
                data: null,
                loading: false,
                error: errorResponse.message || null,
                alert: "error",
              });

              return errorResponse;
            } finally {
              isRefreshing = false;
            }
          }
        }

        // Procesar respuesta según status
        let result: ApiResponse<T>;

        if (response.status === 400) {
          const data = await response.json().catch(() => ({}));
          result = {
            alert: "warning",
            data: data.data,
            message: MensajeError(data.message || data.detail || "Datos inválidos"),
            statusCode: 400,
          };
        } else if (response.status === 401) {
          // Forzar logout
          await handleRefreshFailure<T>(baseURL);
          result = {
            alert: "error",
            message: "No autorizado. Por favor inicia sesión nuevamente.",
            statusCode: 401,
          };
        } else if (response.status === 403) {
          result = {
            alert: "error",
            message: "No tienes permisos para realizar esta acción.",
            statusCode: 403,
          };
        } else if (response.status >= 500) {
          result = {
            alert: "error",
            message: "Error del servidor. Intenta nuevamente más tarde.",
            statusCode: response.status,
          };
        } else {
          result = await handleApiResponse<T>(response);
        }

        setState({
          data: result.data || null,
          loading: false,
          error: result.alert === "error" ? result.message || result.detail || null : null,
          alert: result.alert,
        });

        return result;
      } catch (error) {
        const errorResponse = handleApiError(error);

        setState({
          data: null,
          loading: false,
          error: errorResponse.message || null,
          alert: errorResponse.alert,
        });

        return errorResponse as ApiResponse<T>;
      }
    },
    [baseURL, requiresAuth]
  );

  /**
   * Realiza una petición GET
   */
  const get = useCallback(
    <T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> => {
      return request<T>("GET", url, undefined, config);
    },
    [request]
  );

  /**
   * Realiza una petición POST
   */
  const post = useCallback(
    <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {
      return request<T>("POST", url, body, config);
    },
    [request]
  );

  /**
   * Realiza una petición PUT
   */
  const put = useCallback(
    <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {
      return request<T>("PUT", url, body, config);
    },
    [request]
  );

  /**
   * Realiza una petición PATCH
   */
  const patch = useCallback(
    <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> => {
      return request<T>("PATCH", url, body, config);
    },
    [request]
  );

  /**
   * Realiza una petición DELETE
   */
  const del = useCallback(
    <T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> => {
      return request<T>("DELETE", url, undefined, config);
    },
    [request]
  );

  /**
   * Resetea el estado del hook
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      alert: null,
    });
  }, []);

  return {
    // Métodos de petición
    request,
    get,
    post,
    put,
    patch,
    del,

    // Estado
    data: state.data,
    loading: state.loading,
    error: state.error,
    alert: state.alert,

    // Utilidades
    reset,

    // Helpers de autenticación
    getTokens: getSessionTokens,
    saveTokens,
    clearSession,
  };
};

/**
 * Hook sin autenticación (para rutas públicas)
 */
export const usePublicApi = (baseURL?: string) => {
  return useClientApi(false, baseURL);
};
