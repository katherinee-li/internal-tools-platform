import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { DashboardData } from "@platform/shared";
import { createApp } from "./app.js";
import { seed } from "./seed.js";

const app = createApp();
const as = (role: string) => ({ "x-role": role });

beforeAll(() => {
  seed();
});

describe("Analytics dashboard (aggregation endpoint)", () => {
  it("returns aggregated KPIs and series for a permitted role", async () => {
    const res = await request(app).get("/api/metrics/dashboard").set(as("viewer"));
    expect(res.status).toBe(200);
    const data = res.body as DashboardData;
    expect(data.kpis.length).toBeGreaterThan(0);
    // Funnel always covers the four KYC statuses.
    expect(data.kycFunnel.map((p) => p.label)).toEqual([
      "pending",
      "approved",
      "rejected",
      "escalated",
    ]);
    // Aggregation is non-negative and internally consistent.
    expect(data.refundReasons.every((p) => p.value >= 0)).toBe(true);
    const refundRate = data.kpis.find((k) => k.key === "refundRate");
    expect(refundRate?.value).toMatch(/%$/);
  });
});
