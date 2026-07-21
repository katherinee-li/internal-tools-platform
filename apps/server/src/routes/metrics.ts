import { Router } from "express";
import type { DashboardData, MetricPoint } from "@platform/shared";
import { getDb } from "../db.js";
import { requirePermission } from "../auth.js";

export const metricsRouter = Router();

const usd = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CountRow {
  n: number;
}
interface SumRow {
  s: number;
}

// Aggregation-backed analytics. Unlike the CRUD tools, this endpoint returns
// pre-aggregated series (GROUP BY) rather than rows, and is rendered by the
// separate chart primitive rather than the table/form engine.
metricsRouter.get(
  "/dashboard",
  requirePermission("metrics.read", () => "metrics:dashboard"),
  (_req, res) => {
    const db = getDb();

    const one = (sql: string): number => {
      const row = db.prepare(sql).get() as CountRow | SumRow | undefined;
      if (!row) return 0;
      return "n" in row ? row.n : row.s;
    };

    const settledCount = one("SELECT COUNT(*) n FROM transactions WHERE status='settled'");
    const settledVolume = one("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE status='settled'");
    const refundedTotal = one("SELECT COALESCE(SUM(amount),0) s FROM refunds");
    const refundedTxns = one("SELECT COUNT(DISTINCT transactionId) n FROM refunds");
    const pendingKyc = one("SELECT COUNT(*) n FROM kyc_cases WHERE status='pending'");
    const openTickets = one("SELECT COUNT(*) n FROM support_tickets WHERE status='open'");
    const refundRate = settledCount ? refundedTxns / settledCount : 0;

    const refundsByDay = (
      db
        .prepare(
          "SELECT substr(issuedAt,1,10) d, COUNT(*) c, COALESCE(SUM(amount),0) a FROM refunds GROUP BY d ORDER BY d",
        )
        .all() as { d: string; c: number; a: number }[]
    ).map<MetricPoint>((r) => ({ label: r.d, value: r.a, secondary: r.c }));

    const funnelCounts = new Map<string, number>();
    for (const r of db
      .prepare("SELECT status, COUNT(*) c FROM kyc_cases GROUP BY status")
      .all() as { status: string; c: number }[]) {
      funnelCounts.set(r.status, r.c);
    }
    const kycFunnel: MetricPoint[] = ["pending", "approved", "rejected", "escalated"].map((s) => ({
      label: s,
      value: funnelCounts.get(s) ?? 0,
    }));

    const refundReasons = (
      db
        .prepare("SELECT reason, COUNT(*) c FROM refunds GROUP BY reason ORDER BY c DESC")
        .all() as { reason: string; c: number }[]
    ).map<MetricPoint>((r) => ({ label: r.reason, value: r.c }));

    const data: DashboardData = {
      kpis: [
        { key: "settledVolume", label: "Settled volume", value: usd(settledVolume) },
        { key: "refundedTotal", label: "Total refunded", value: usd(refundedTotal) },
        { key: "refundRate", label: "Refund rate", value: `${(refundRate * 100).toFixed(1)}%` },
        { key: "pendingKyc", label: "KYC pending", value: String(pendingKyc) },
        { key: "openTickets", label: "Open tickets", value: String(openTickets) },
      ],
      refundsByDay,
      kycFunnel,
      refundReasons,
    };
    res.json(data);
  },
);
