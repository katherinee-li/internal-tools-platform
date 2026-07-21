import { type Connector, type ConnectorContext, ConnectorError } from "./types.js";

// Central auth config for a REST connector. The token is read from the
// environment at construction and NEVER logged; keyless public APIs simply
// omit it. Swapping in a Stripe / internal-service connector = new baseUrl +
// this auth block, nothing else changes for the tool.
export type RestAuth =
  | { type: "none" }
  | { type: "bearer"; token: string | undefined }
  | { type: "header"; headerName: string; token: string | undefined };

export interface RestConnectorOptions<Row, Raw = unknown> {
  id: string;
  description: string;
  baseUrl: string;
  path: string;
  auth?: RestAuth;
  // Map tool filters -> upstream query string.
  query?: (ctx: ConnectorContext) => Record<string, string>;
  // Map the upstream response body -> the tool's row shape.
  map: (raw: Raw, ctx: ConnectorContext) => Row[];
  timeoutMs?: number;
  // Injectable for deterministic tests; defaults to global fetch.
  fetchImpl?: typeof fetch;
}

export class RestConnector<Row, Raw = unknown> implements Connector<Row> {
  readonly kind = "rest" as const;
  readonly id: string;
  readonly description: string;
  private readonly opts: RestConnectorOptions<Row, Raw>;

  constructor(opts: RestConnectorOptions<Row, Raw>) {
    this.id = opts.id;
    this.description = opts.description;
    this.opts = opts;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    const auth = this.opts.auth ?? { type: "none" };
    if (auth.type === "bearer" && auth.token) h["Authorization"] = `Bearer ${auth.token}`;
    if (auth.type === "header" && auth.token) h[auth.headerName] = auth.token;
    return h;
  }

  async list(ctx: ConnectorContext): Promise<Row[]> {
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    const url = new URL(this.opts.path, this.opts.baseUrl);
    for (const [k, v] of Object.entries(this.opts.query?.(ctx) ?? {})) {
      if (v) url.searchParams.set(k, v);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 8000);
    let raw: Raw;
    try {
      const res = await fetchImpl(url.toString(), {
        headers: this.headers(),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new ConnectorError(`Upstream ${this.id} responded ${res.status}.`, "connector_error", 502);
      }
      raw = (await res.json()) as Raw;
    } catch (err) {
      if (err instanceof ConnectorError) throw err;
      const reason = err instanceof Error && err.name === "AbortError" ? "timed out" : "unreachable";
      throw new ConnectorError(`Data source '${this.id}' ${reason}.`, "connector_error", 502);
    } finally {
      clearTimeout(timer);
    }
    return this.opts.map(raw, ctx);
  }
}
