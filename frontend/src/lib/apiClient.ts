import { supabase } from "@/integrations/supabase/client";

const DEFAULT_API_BASE = "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 15000;

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");

export type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  rawResponse?: boolean;
};

export async function getAuthContext() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token || null;
  const authId = session?.user?.id || null;

  return { token, authId };
}

export async function buildAuthHeaders() {
  const { token, authId } = await getAuthContext();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (authId) {
    headers["x-auth-id"] = authId;
  }

  return headers;
}

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { skipAuth = false, rawResponse = false, headers, body, ...rest } = options;
  const authHeaders = skipAuth ? {} : await buildAuthHeaders();
  const method = (rest.method || "GET").toUpperCase();
  const url = `${API_BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    ...authHeaders,
    ...(headers as Record<string, string>),
  };

  const isFormData = body instanceof FormData;
  if (body && !isFormData && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  console.log("[API] request", { method, path, url, skipAuth });

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error("[API] timeout", { method, path, timeoutMs: REQUEST_TIMEOUT_MS });
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms: ${method} ${path}`);
    }
    console.error("[API] network-error", { method, path, error });
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  console.log("[API] response", { method, path, status: response.status });

  if (rawResponse) {
    return response as unknown as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === "object" && (payload.message || payload.error)) ||
      `Request failed with status ${response.status}`;
    console.error("[API] http-error", { method, path, status: response.status, payload });
    if (response.status === 429) {
      const err: any = new Error(message as string);
      err.isRateLimit = true;
      err.status = 429;
      err.retryAfter = response.headers.get("retry-after") || null;
      throw err;
    }
    throw new Error(message as string);
  }

  return payload as T;
}
