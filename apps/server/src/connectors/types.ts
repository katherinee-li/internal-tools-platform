// ---------------------------------------------------------------------------
// Connector abstraction — the platform's pluggable data layer.
//
// This is the miniature version of Retool's biggest value: "managed
// connectors". A tool declares WHERE its data comes from (a `Connector`) and
// the platform is indifferent to whether that is a local SQL table, an internal
// microservice, or a third-party REST/GraphQL API. Auth, timeouts, and error
// mapping are handled once, centrally, so every new data source is cheap.
//
// Two implementations ship here:
//   - RestConnector   — live external HTTP APIs (auth header injected centrally)
//   - SqliteConnector — the local database (same interface as the remote one)
//
// A new connector = implement `list()`. A new tool then just points at one.
// ---------------------------------------------------------------------------

export interface ConnectorContext {
  // Request-scoped inputs (search/filter params from the tool page).
  filters: Record<string, string | undefined>;
}

export interface Connector<Row = Record<string, unknown>> {
  readonly id: string;
  readonly kind: "sqlite" | "rest";
  readonly description: string;
  list(ctx: ConnectorContext): Promise<Row[]>;
}

// Thrown by connectors so the API layer can map any data-source failure to a
// uniform error envelope instead of leaking upstream/internal details.
export class ConnectorError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "connector_error", status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
