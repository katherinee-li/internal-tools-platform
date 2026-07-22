import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { AuditEvent } from "@platform/shared";
import { createApp } from "./app.js";
import { seed } from "./seed.js";

const app = createApp();
const as = (role: string) => ({ "x-role": role });

async function auditFor(resource: string): Promise<AuditEvent[]> {
  const res = await request(app).get("/api/audit").set(as("admin"));
  return (res.body as AuditEvent[]).filter((e) => e.resource === resource);
}

beforeAll(() => {
  seed();
});

describe("RBAC read access", () => {
  it("viewer can read every tool", async () => {
    for (const path of ["/api/kyc", "/api/refunds/transactions", "/api/flags", "/api/audit"]) {
      const res = await request(app).get(path).set(as("viewer"));
      expect(res.status).toBe(200);
    }
  });
});

describe("Adversarial: Viewer attempts a refund", () => {
  it("is denied (403) and writes a denied — never success — audit event", async () => {
    const res = await request(app)
      .post("/api/refunds")
      .set(as("viewer"))
      .send({ transactionId: "txn_2002", amount: 100, reason: "fraud" });
    expect(res.status).toBe(403);

    const events = await auditFor("txn:txn_2002");
    expect(events.some((e) => e.outcome === "denied")).toBe(true);
    expect(events.some((e) => e.outcome === "success")).toBe(false);
  });
});

describe("Adversarial: Operator attempts a production flag change", () => {
  it("is denied (403); operator CAN change development", async () => {
    const prod = await request(app)
      .patch("/api/flags/production/instant_payouts")
      .set(as("operator"))
      .send({ enabled: true, rolloutPercentage: 100 });
    expect(prod.status).toBe(403);

    const dev = await request(app)
      .patch("/api/flags/development/instant_payouts")
      .set(as("operator"))
      .send({ enabled: true, rolloutPercentage: 50 });
    expect(dev.status).toBe(200);

    const events = await auditFor("flag:production/instant_payouts");
    expect(events.some((e) => e.outcome === "denied")).toBe(true);
    expect(events.some((e) => e.outcome === "success")).toBe(false);
  });

  it("admin CAN change production", async () => {
    const res = await request(app)
      .patch("/api/flags/production/instant_payouts")
      .set(as("admin"))
      .send({ enabled: true, rolloutPercentage: 10 });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });
});

describe("Disabling a flag forces rollout to 0", () => {
  it("ignores a submitted rollout when the flag is turned off", async () => {
    const res = await request(app)
      .patch("/api/flags/development/dark_mode")
      .set(as("operator"))
      .send({ enabled: false, rolloutPercentage: 80 });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.rolloutPercentage).toBe(0);
  });
});

describe("Adversarial: Refund exceeds the remaining refundable amount", () => {
  it("is rejected (400) with a validation error and no success audit", async () => {
    // txn_2002 amount 4500; already refunded 0. Ask for 5000.
    const res = await request(app)
      .post("/api/refunds")
      .set(as("operator"))
      .send({ transactionId: "txn_2002", amount: 5000, reason: "fraud" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation");

    const events = await auditFor("txn:txn_2002");
    expect(events.some((e) => e.action === "refund.issue" && e.outcome === "success")).toBe(false);
  });
});

describe("Adversarial: Same transaction is refunded twice", () => {
  it("allows the first full refund and rejects the second", async () => {
    const first = await request(app)
      .post("/api/refunds")
      .set(as("operator"))
      .send({ transactionId: "txn_2007", amount: 32000, reason: "customer_request" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/refunds")
      .set(as("operator"))
      .send({ transactionId: "txn_2007", amount: 100, reason: "fraud" });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already fully refunded/i);
  });
});

describe("Adversarial: KYC decision submitted without a note", () => {
  it("is rejected (400) and records an error — not success", async () => {
    const res = await request(app)
      .post("/api/kyc/kyc_1002/decision")
      .set(as("operator"))
      .send({ decision: "approved" });
    expect(res.status).toBe(400);

    const events = await auditFor("kyc:kyc_1002");
    expect(events.some((e) => e.outcome === "success")).toBe(false);
  });

  it("succeeds with a note", async () => {
    const res = await request(app)
      .post("/api/kyc/kyc_1002/decision")
      .set(as("operator"))
      .send({ decision: "approved", note: "Documents verified against sanctions list." });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");

    const events = await auditFor("kyc:kyc_1002");
    expect(events.some((e) => e.outcome === "success")).toBe(true);
  });
});
