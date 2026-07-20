import cors from "cors";
import express from "express";
import { permissionsFor } from "@platform/shared";
import { mockAuth } from "./auth.js";
import { kycRouter } from "./routes/kyc.js";
import { refundsRouter } from "./routes/refunds.js";
import { flagsRouter } from "./routes/flags.js";
import { ticketsRouter } from "./routes/tickets.js";
import { auditRouter } from "./routes/audit.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(mockAuth);

  // Identity + effective permissions for the signed-in (mock) user.
  app.get("/api/me", (req, res) => {
    res.json({ user: req.user, permissions: permissionsFor(req.user.role) });
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/kyc", kycRouter);
  app.use("/api/refunds", refundsRouter);
  app.use("/api/flags", flagsRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/audit", auditRouter);

  return app;
}
