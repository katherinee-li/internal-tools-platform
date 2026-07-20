import type { NextFunction, Request, Response } from "express";
import { can, ROLES, type Permission, type Role, type User } from "@platform/shared";
import { recordAudit } from "./audit.js";
import { getDb } from "./db.js";

// Demo users, one per role. In production this is replaced by SSO/OIDC identity.
export const DEMO_USERS: Record<Role, User> = {
  viewer: { id: "u_viewer", name: "Vera Viewer", email: "viewer@acme.test", role: "viewer" },
  operator: { id: "u_operator", name: "Otis Operator", email: "operator@acme.test", role: "operator" },
  admin: { id: "u_admin", name: "Ada Admin", email: "admin@acme.test", role: "admin" },
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

// DEV-ONLY mock auth: role comes from the `x-role` header set by the client
// role selector. Documented as a production gap (replace with real IdP).
export function mockAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = String(req.header("x-role") ?? "viewer").toLowerCase();
  const role: Role = (ROLES as string[]).includes(header) ? (header as Role) : "viewer";
  req.user = DEMO_USERS[role];
  next();
}

// Guard factory: enforces a permission, and on denial writes a `denied` audit
// event so that failed/denied actions are visible and never look successful.
export function requirePermission(
  permission: Permission,
  resourceFor: (req: Request) => string,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (can(req.user.role, permission)) {
      next();
      return;
    }
    recordAudit(getDb(), {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: permission,
      resource: resourceFor(req),
      outcome: "denied",
      detail: `Role '${req.user.role}' lacks permission '${permission}'.`,
    });
    res.status(403).json({ error: "You do not have permission to perform this action.", code: "forbidden" });
  };
}
