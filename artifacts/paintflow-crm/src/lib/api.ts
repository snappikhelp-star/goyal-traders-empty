export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function deepSnakeToCamel<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepSnakeToCamel(v)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[snakeToCamelKey(k)] = deepSnakeToCamel(v);
    }
    return result as unknown as T;
  }
  return value as T;
}

export function deepCamelToSnake<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((v) => deepCamelToSnake(v)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[camelToSnakeKey(k)] = deepCamelToSnake(v);
    }
    return result as unknown as T;
  }
  return value as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const rawBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (isJson && rawBody && typeof rawBody === "object" && "message" in rawBody
        ? (rawBody as { message?: string }).message
        : undefined) ?? (typeof rawBody === "string" && rawBody ? rawBody : `Request failed with status ${res.status}`);
    throw new ApiError(res.status, message);
  }

  // Backend (Drizzle) returns camelCase field names; the existing frontend
  // components expect snake_case (legacy Supabase-shaped) field names.
  return isJson ? deepCamelToSnake<T>(rawBody) : (rawBody as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      // Frontend sends snake_case bodies; backend zod schemas expect camelCase.
      method: "POST",
      body: data !== undefined ? JSON.stringify(deepSnakeToCamel(data)) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(deepSnakeToCamel(data)) : undefined,
    }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
