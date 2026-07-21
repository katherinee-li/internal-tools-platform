import { fileURLToPath } from "node:url";
import { ENVIRONMENTS } from "@platform/shared";
import { getDb } from "./db.js";

// Deterministic mock data so the prototype is demoable without real vendors.
function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400_000).toISOString();
}

export function seed(): void {
  const db = getDb();
  const tables = ["kyc_cases", "transactions", "refunds", "feature_flags", "audit_events"];
  for (const t of tables) db.exec(`DELETE FROM ${t};`);

  const kyc = db.prepare(
    `INSERT INTO kyc_cases (id, customerName, email, country, documentType, submittedAt, status, risk)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const kycRows = [
    ["kyc_1001", "Maria Gomez", "maria@example.com", "US", "passport", 1, "pending", "low"],
    ["kyc_1002", "Liu Wei", "liu@example.com", "SG", "national_id", 2, "pending", "medium"],
    ["kyc_1003", "John Smith", "john@example.com", "GB", "drivers_license", 3, "pending", "high"],
    ["kyc_1004", "Amara Okafor", "amara@example.com", "NG", "passport", 4, "escalated", "high"],
    ["kyc_1005", "Sofia Rossi", "sofia@example.com", "IT", "national_id", 5, "approved", "low"],
    ["kyc_1006", "Kenji Tanaka", "kenji@example.com", "JP", "passport", 6, "pending", "medium"],
    ["kyc_1007", "Priya Nair", "priya@example.com", "IN", "passport", 7, "rejected", "high"],
  ];
  for (const r of kycRows) kyc.run(r[0], r[1], r[2], r[3], r[4], iso(r[5] as number), r[6], r[7]);

  const txn = db.prepare(
    `INSERT INTO transactions (id, customerName, email, amount, currency, createdAt, status, refundedAmount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const txnRows: Array<[string, string, string, number, string, number, string, number]> = [
    ["txn_2001", "Maria Gomez", "maria@example.com", 12000, "USD", 1, "settled", 2000],
    ["txn_2002", "Liu Wei", "liu@example.com", 4500, "USD", 2, "settled", 1500],
    ["txn_2003", "John Smith", "john@example.com", 9900, "USD", 3, "settled", 5000],
    ["txn_2004", "Amara Okafor", "amara@example.com", 25000, "USD", 4, "settled", 25000],
    ["txn_2005", "Sofia Rossi", "sofia@example.com", 1500, "USD", 5, "pending", 0],
    ["txn_2006", "Kenji Tanaka", "kenji@example.com", 7800, "USD", 6, "failed", 0],
    ["txn_2007", "Priya Nair", "priya@example.com", 32000, "USD", 7, "settled", 0],
  ];
  for (const r of txnRows) txn.run(r[0], r[1], r[2], r[3], r[4], iso(r[5]), r[6], r[7]);

  // Additional settled transactions (no refunds) so aggregate KPIs — e.g. the
  // refund rate on the analytics dashboard — read realistically rather than
  // being dominated by the handful of hand-authored rows above.
  const filler = [
    "Noah Baker", "Emma Wilson", "Lucas Silva", "Olivia Chen", "Ethan Park",
    "Ava Martin", "Leo Dubois", "Mia Rossi", "Ivan Petrov", "Zoe Clarke",
    "Omar Haddad", "Nina Kaur", "Felix Wagner", "Sara Lopez", "Hugo Meyer",
  ];
  filler.forEach((name, i) => {
    const amount = 1500 + ((i * 2137) % 28000);
    const days = 1 + (i % 7);
    const email = `${name.split(" ")[0].toLowerCase()}@example.com`;
    txn.run(`txn_21${String(i).padStart(2, "0")}`, name, email, amount, "USD", iso(days), "settled", 0);
  });

  // Historical refunds (kept consistent with transactions.refundedAmount) so the
  // analytics dashboard has a trend + reason breakdown to aggregate.
  const refund = db.prepare(
    `INSERT INTO refunds (id, transactionId, amount, reason, note, issuedBy, issuedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const refundRows: Array<[string, string, number, string, number]> = [
    ["ref_9001", "txn_2001", 2000, "duplicate_charge", 1],
    ["ref_9002", "txn_2002", 1500, "customer_request", 2],
    ["ref_9003", "txn_2003", 5000, "product_issue", 3],
    ["ref_9004", "txn_2004", 25000, "fraud", 4],
  ];
  for (const r of refundRows) refund.run(r[0], r[1], r[2], r[3], null, "u_operator", iso(r[4]));

  const flag = db.prepare(
    `INSERT INTO feature_flags (key, environment, description, enabled, rolloutPercentage, updatedBy, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const flagDefs: Array<[string, string, boolean, number]> = [
    ["new_onboarding_flow", "Redesigned customer onboarding wizard", true, 100],
    ["instant_payouts", "Enable instant payout rail", false, 0],
    ["fraud_ml_scoring", "ML-based fraud scoring in checkout", true, 25],
    ["dark_mode", "Dark mode UI theme", true, 50],
    ["crypto_deposits", "Allow crypto deposits", false, 0],
  ];
  for (const [key, description, enabled, pct] of flagDefs) {
    for (const env of ENVIRONMENTS) {
      // Production is typically more conservative than lower environments.
      const prod = env === "production";
      flag.run(key, env, description, prod ? (enabled ? 1 : 0) : 1, prod ? pct : Math.min(100, pct + 25), null, null);
    }
  }

  console.log("[seed] done:", { kyc: kycRows.length, transactions: txnRows.length, flags: flagDefs.length * ENVIRONMENTS.length });
}

// Only auto-run when invoked directly (e.g. `npm run seed`), not when imported by tests.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  seed();
}
