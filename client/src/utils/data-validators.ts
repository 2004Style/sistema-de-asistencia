/**
 * Utilidades para validación segura de datos
 * Previene errores de tipo como "Cannot read property map of undefined"
 */

/**
 * Valida que un valor sea un array y lo retorna
 * Si no es array, retorna array vacío
 */
export function ensureArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Valida respuesta paginada y retorna estructura consistente
 */
export function validatePaginatedResponse<T>(response: any): { records: T[]; total: number } {
  return {
    records: ensureArray<T>(response?.records ?? response?.data ?? response),
    total: typeof response?.total === "number" ? response.total : 0,
  };
}

/**
 * Valida que un objeto tenga las propiedades requeridas
 */
export function validateObject<T extends Record<string, any>>(obj: any, requiredKeys: (keyof T)[]): obj is T {
  if (!obj || typeof obj !== "object") return false;
  return requiredKeys.every((key) => key in obj);
}

/**
 * Maneja errores de API de forma consistente
 */
export function getErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.statusText) return error.response.statusText;
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
  let lastError: any;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // No reintentar si es error 4xx (cliente)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
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
export function normalizeApiResponse<T>(response: any): T | null {
  if (!response) return null;
  if (response.data) return response.data as T;
  return response as T;
}

/**
 * Valida que array no esté vacío antes de acceder
 */
export function safeArrayAccess<T>(array: any[], index: number, defaultValue?: T): T | undefined {
  if (!Array.isArray(array)) return defaultValue;
  if (index < 0 || index >= array.length) return defaultValue;
  return array[index] as T;
}
