/**
 * Utilidades para validación segura de datos
 * Previene errores de tipo como "Cannot read property map of undefined"
 */

/**
 * Valida que un valor sea un array y lo retorna
 * Si no es array, retorna array vacío
 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Valida respuesta paginada y retorna estructura consistente
 */
export function validatePaginatedResponse<T>(response: unknown): { records: T[]; total: number } {
  const obj = response as Record<string, unknown>;
  return {
    records: ensureArray<T>(obj?.records ?? obj?.data ?? response),
    total: typeof obj?.total === "number" ? obj.total : 0,
  };
}

/**
 * Valida que un objeto tenga las propiedades requeridas
 */
export function validateObject<T extends Record<string, unknown>>(obj: unknown, requiredKeys: (keyof T)[]): obj is T {
  if (!obj || typeof obj !== "object") return false;
  return requiredKeys.every((key) => key in (obj as Record<string, unknown>));
}

/**
 * Maneja errores de API de forma consistente
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  const err = error as Record<string, unknown>;
  if (err?.message) return String(err.message);
  const response = err?.response as Record<string, unknown>;
  if (response?.data) {
    const data = response.data as Record<string, unknown>;
    if (data?.detail) return String(data.detail);
    if (data?.error) return String(data.error);
  }
  if (response?.statusText) return String(response.statusText);
  return "Error desconocido. Por favor, intente de nuevo.";
}

/**
 * Valida rango de fechas
 */
export function validateDateRange(startDate: string | Date, endDate: string | Date): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end && !isNaN(start.getTime()) && !isNaN(end.getTime());
}

/**
 * Realiza retry automático en caso de error temporal
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delayMs: number = 1000): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const err = error as Record<string, unknown>;
      const status = (err?.response as Record<string, unknown>)?.status as number;

      // No reintentar si es error 4xx (cliente)
      if (typeof status === "number" && status >= 400 && status < 500) {
        throw error;
      }

      // Esperar antes de reintentar
      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Normaliza respuesta de API
 */
export function normalizeApiResponse<T>(response: unknown): T | null {
  if (!response) return null;
  const obj = response as Record<string, unknown>;
  if (obj.data) return obj.data as T;
  return response as T;
}

/**
 * Valida que array no esté vacío antes de acceder
 */
export function safeArrayAccess<T>(array: unknown[], index: number, defaultValue?: T): T | undefined {
  if (!Array.isArray(array)) return defaultValue;
  if (index < 0 || index >= array.length) return defaultValue;
  return array[index] as T;
}
