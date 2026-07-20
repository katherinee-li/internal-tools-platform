import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ROLES, type Permission, type Role, type User } from "@platform/shared";
import { ApiClient } from "./api";

interface AuthState {
  role: Role;
  setRole: (r: Role) => void;
  user: User | null;
  permissions: Permission[];
  can: (p: Permission) => boolean;
  api: ApiClient;
}

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "itp.dev.role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(
    () => (localStorage.getItem(STORAGE_KEY) as Role) || "viewer",
  );
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // The ApiClient always reads the current role via this ref-like closure.
  const roleRef = React.useRef(role);
  roleRef.current = role;
  const api = useMemo(() => new ApiClient(() => roleRef.current), []);

  const setRole = (r: Role) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRoleState(r);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: User; permissions: Permission[] }>("/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        setPermissions(res.permissions);
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [role, api]);

  const value: AuthState = {
    role,
    setRole,
    user,
    permissions,
    can: (p) => permissions.includes(p),
    api,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ROLES };
