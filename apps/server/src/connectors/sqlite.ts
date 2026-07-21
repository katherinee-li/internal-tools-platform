import type { DB } from "../db.js";
import type { Connector, ConnectorContext } from "./types.js";

export interface SqliteConnectorOptions<Row> {
  id: string;
  description: string;
  db: () => DB;
  // Build a parameterized query from the request-scoped filters.
  buildQuery: (ctx: ConnectorContext) => { sql: string; params: unknown[] };
  map?: (row: Record<string, unknown>) => Row;
}

// The local database exposed through the SAME `Connector` interface as any
// remote API. This is the point of the abstraction: the tool page cannot tell
// whether its rows came from SQLite or a third-party service.
export class SqliteConnector<Row> implements Connector<Row> {
  readonly kind = "sqlite" as const;
  readonly id: string;
  readonly description: string;
  private readonly opts: SqliteConnectorOptions<Row>;

  constructor(opts: SqliteConnectorOptions<Row>) {
    this.id = opts.id;
    this.description = opts.description;
    this.opts = opts;
  }

  async list(ctx: ConnectorContext): Promise<Row[]> {
    const { sql, params } = this.opts.buildQuery(ctx);
    const rows = this.opts.db().prepare(sql).all(...params) as Record<string, unknown>[];
    return this.opts.map ? rows.map(this.opts.map) : (rows as Row[]);
  }
}
