import type { AuthUser } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const TOKEN_KEY = "sl_token";
const USER_KEY = "sl_user";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(accessToken: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
}

function isApiErrorEnvelope(payload: unknown): payload is { error: { message: string } } {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as { error?: unknown };
  if (typeof candidate.error !== "object" || candidate.error === null) return false;
  return typeof (candidate.error as { message?: unknown }).message === "string";
}

function isDataEnvelope<T>(payload: unknown): payload is { data: T } {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

const NETWORK_MESSAGE =
  "We could not reach Rudrian servers. Please check your connection and try again.";

export async function apiFetch<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
  const { method = "GET", body, token, cache = "no-store" } = options;

  const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
  const resolvedToken = token === undefined ? getStoredToken() : token;
  if (resolvedToken) headers.set("Authorization", `Bearer ${resolvedToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      cache,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(NETWORK_MESSAGE);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (isApiErrorEnvelope(payload)) {
      throw new ApiError(payload.error.message, response.status);
    }
    throw new ApiError(
      response.status >= 500
        ? "Rudrian servers are temporarily unavailable. Please try again in a few minutes."
        : "Your request could not be completed. Please review the details and try again.",
      response.status,
    );
  }

  if (isDataEnvelope<T>(payload)) return payload.data;
  return payload as T;
}
