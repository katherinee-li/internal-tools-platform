import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./platform/AppShell";
import { TOOLS } from "./tools/registry";

export function App() {
  const nav = TOOLS.map((t) => ({ path: t.path, label: t.label, icon: t.icon }));
  return (
    <AppShell nav={nav}>
      <Routes>
        <Route path="/" element={<Navigate to={TOOLS[0].path} replace />} />
        {TOOLS.map((t) => (
          <Route key={t.path} path={t.path} element={t.element} />
        ))}
        <Route path="*" element={<div className="tool-page">Not found.</div>} />
      </Routes>
    </AppShell>
  );
}
