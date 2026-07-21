import { Router } from "express";
import type { FxRate } from "@platform/shared";
import { requirePermission } from "../auth.js";
import { RestConnector, ConnectorError } from "../connectors/index.js";

// FX Rates — a read-only tool backed by a LIVE external REST API, proving the
// platform is not limited to mock/local data. The connector below could be
// swapped for Stripe, an internal ledger service, or Postgres without touching
// the route or the UI.
interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

// Auth header is injected centrally from the environment. Frankfurter is a
// keyless public API, so the token is absent here; a paid/internal source would
// set FX_API_KEY and the same code path attaches it. The key is never logged.
const fxConnector = new RestConnector<FxRate, FrankfurterResponse>({
  id: "frankfurter-fx",
  description: "Live foreign-exchange reference rates (frankfurter.app / ECB).",
  baseUrl: "https://api.frankfurter.app",
  path: "/latest",
  auth: { type: "header", headerName: "X-Api-Key", token: process.env.FX_API_KEY },
  query: (ctx) => ({ from: (ctx.filters.base || "USD").toUpperCase() }),
  map: (raw) =>
    Object.entries(raw.rates).map(([currency, rate]) => ({
      base: raw.base,
      currency,
      rate,
      inverse: rate ? Number((1 / rate).toFixed(6)) : 0,
      asOf: raw.date,
    })),
  timeoutMs: 8000,
});

export const ratesRouter = Router();

ratesRouter.get("/", requirePermission("rates.read", () => "rates:latest"), async (req, res) => {
  const { q, base } = req.query as Record<string, string | undefined>;
  try {
    let rows = await fxConnector.list({ filters: { base } });
    if (q) {
      const needle = q.toUpperCase();
      rows = rows.filter((r) => r.currency.toUpperCase().includes(needle));
    }
    rows.sort((a, b) => a.currency.localeCompare(b.currency));
    res.json(rows);
  } catch (err) {
    if (err instanceof ConnectorError) {
      res.status(err.status).json({ error: err.message, code: "internal" });
      return;
    }
    res.status(500).json({ error: "Failed to load rates.", code: "internal" });
  }
});
