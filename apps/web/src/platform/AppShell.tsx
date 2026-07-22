import React from "react";
import { NavLink } from "react-router-dom";
import { ROLES, useAuth } from "./auth";
import type { Role } from "@platform/shared";

export interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer (read-only)",
  operator: "Operator (KYC + refunds)",
  admin: "Admin (full access)",
};

// Shared application shell: left nav + top bar with the DEV-ONLY role selector.
// Every tool renders inside this shell, which is what makes the three apps look
// like one platform rather than three demos.
export function AppShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const { role, setRole, user } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">▣</span>
          <div>
            <div className="brand-name">Internal Tools</div>
            <div className="brand-sub">Platform</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{item.icon ?? "•"}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer muted">Prototype · mock data</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="dev-badge" title="Development-only role switcher for demonstration">
            DEV ROLE SELECTOR
          </div>
          <div className="topbar-right">
            <select className="role-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <span className="user-chip">{user?.name ?? "…"}</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
