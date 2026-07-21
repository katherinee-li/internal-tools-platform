import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { permissionsFor } from "@platform/shared";
import { mockAuth } from "./auth.js";
import { kycRouter } from "./routes/kyc.js";
import { refundsRouter } from "./routes/refunds.js";
import { flagsRouter } from "./routes/flags.js";
import { metricsRouter } from "./routes/metrics.js";
import { auditRouter } from "./routes/audit.js";

export function createApp() {
  const app = express();
  // Restrict CORS to the allowed web origins. Defaults to the local Vite dev
  // server; override with CORS_ORIGINS (comma-separated) in other environments.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
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
  app.use("/api/metrics", metricsRouter);
  app.use("/api/audit", auditRouter);

  // Single-image production mode: serve the built web app from the same origin
  // as the API (so relative `/api` calls work without a proxy). Enabled by
  // SERVE_WEB=1; the built assets path can be overridden with WEB_DIST.
  if (process.env.SERVE_WEB) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const webDist = process.env.WEB_DIST ?? path.resolve(here, "../../web/dist");
    app.use(express.static(webDist));
    // SPA fallback for client-side routes (never shadow /api).
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
  }

  return app;
}
