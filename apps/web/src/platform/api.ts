import type { Role } from "@platform/shared";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Reusable typed data layer. A single place that injects the (dev-only) role
// header, parses the API error envelope, and throws typed errors. Every tool
// goes through this, so auth + error handling are uniform.
export class ApiClient {
  constructor(private getRole: () => Role) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-role": this.getRole(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(data?.error ?? "Request failed", data?.code ?? "internal", res.status);
    }
    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
}

export function buildQuery(filters: Record<string, string>): string {
  const entries = Object.entries(filters).filter(([, v]) => v !== "" && v != null);
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}
