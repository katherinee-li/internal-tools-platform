import Database from "better-sqlite3";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kyc_cases (
  id TEXT PRIMARY KEY,
  customerName TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  documentType TEXT NOT NULL,
  submittedAt TEXT NOT NULL,
  status TEXT NOT NULL,
  risk TEXT NOT NULL,
  reviewerNote TEXT,
  decidedBy TEXT,
  decidedAt TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  customerName TEXT NOT NULL,
  email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL,
  refundedAmount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  issuedBy TEXT NOT NULL,
  issuedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT NOT NULL,
  environment TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  rolloutPercentage INTEGER NOT NULL,
  updatedBy TEXT,
  updatedAt TEXT,
  PRIMARY KEY (key, environment)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  customerName TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  note TEXT,
  updatedBy TEXT,
  updatedAt TEXT
);

-- Append-only audit log. No UPDATE/DELETE is ever issued against this table.
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actorId TEXT NOT NULL,
  actorRole TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail TEXT
);
`;

export function openDb(path: string): DB {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

let singleton: DB | null = null;

export function getDb(): DB {
  if (!singleton) {
    const path = process.env.DB_PATH ?? "./data.db";
    singleton = openDb(path);
  }
  return singleton;
}
