import type { Permission, Role } from "./types.js";

// Single source of truth for role -> permission mapping.
// Enforced on the server; also used on the client to hide/disable UI.
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["kyc.read", "refund.read", "flag.read", "ticket.read", "rates.read", "metrics.read", "audit.read"],
  operator: [
    "kyc.read",
    "kyc.decide",
    "refund.read",
    "refund.issue",
    "flag.read",
    "flag.write",
    "ticket.read",
    "ticket.write",
    "rates.read",
    "metrics.read",
    "audit.read",
  ],
  admin: [
    "kyc.read",
    "kyc.decide",
    "refund.read",
    "refund.issue",
    "flag.read",
    "flag.write",
    "flag.write.production",
    "ticket.read",
    "ticket.write",
    "rates.read",
    "metrics.read",
    "audit.read",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
