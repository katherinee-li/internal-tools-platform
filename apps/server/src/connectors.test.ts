import { describe, expect, it } from "vitest";
import { openDb } from "./db.js";
import { RestConnector, SqliteConnector, ConnectorError } from "./connectors/index.js";

// Deterministic fake fetch so connector tests never touch the network.
function fakeFetch(status: number, body: unknown, capture?: (url: string, init?: RequestInit) => void) {
  return (async (url: string, init?: RequestInit) => {
    capture?.(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
}

describe("RestConnector", () => {
  it("maps an upstream response to rows and injects the auth header + query", async () => {
    let seenUrl = "";
    let seenAuth: string | undefined;
    const connector = new RestConnector<{ code: string; rate: number }, { rates: Record<string, number> }>({
      id: "test-fx",
      description: "test",
      baseUrl: "https://example.test",
      path: "/latest",
      auth: { type: "header", headerName: "X-Api-Key", token: "secret-key" },
      query: (ctx) => ({ from: ctx.filters.base ?? "USD" }),
      map: (raw) => Object.entries(raw.rates).map(([code, rate]) => ({ code, rate })),
      fetchImpl: fakeFetch(200, { rates: { EUR: 0.9, GBP: 0.8 } }, (url, init) => {
        seenUrl = url;
        seenAuth = (init?.headers as Record<string, string>)["X-Api-Key"];
      }),
    });

    const rows = await connector.list({ filters: { base: "USD" } });
    expect(rows).toEqual([
      { code: "EUR", rate: 0.9 },
      { code: "GBP", rate: 0.8 },
    ]);
    expect(seenUrl).toContain("from=USD");
    expect(seenAuth).toBe("secret-key");
  });

  it("raises a ConnectorError (502) on an upstream failure", async () => {
    const connector = new RestConnector<unknown>({
      id: "test-fx",
      description: "test",
      baseUrl: "https://example.test",
      path: "/latest",
      map: () => [],
      fetchImpl: fakeFetch(500, {}),
    });
    await expect(connector.list({ filters: {} })).rejects.toBeInstanceOf(ConnectorError);
  });
});

describe("SqliteConnector", () => {
  it("reads local data through the same Connector interface", async () => {
    const db = openDb(":memory:");
    db.exec("INSERT INTO support_tickets (id, subject, customerName, priority, status, createdAt) VALUES ('t1','S','C','low','open','2026-01-01')");
    const connector = new SqliteConnector<{ id: string; status: string }>({
      id: "local-tickets",
      description: "test",
      db: () => db,
      buildQuery: (ctx) => ({
        sql: "SELECT id, status FROM support_tickets WHERE status = ?",
        params: [ctx.filters.status ?? "open"],
      }),
    });

    const rows = await connector.list({ filters: { status: "open" } });
    expect(rows).toEqual([{ id: "t1", status: "open" }]);
    expect(connector.kind).toBe("sqlite");
  });
});
