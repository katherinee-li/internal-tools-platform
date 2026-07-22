import type { DashboardData, DashboardKpi, MetricPoint, Permission } from "@platform/shared";
import type { ApiClient } from "./api";

// Declarative contract for an analytics dashboard — the non-CRUD sibling of
// ToolDefinition. A dashboard = KPIs + a set of chart widgets, each selecting
// a series out of the fetched DashboardData. Adding another dashboard is now
// config (like adding a CRUD tool), because the chart primitive already exists.

export interface DashboardWidget {
  key: string;
  title: string;
  kind: "bars" | "columns";
  select: (d: DashboardData) => MetricPoint[];
  format?: (p: MetricPoint) => string;
}

export interface DashboardDefinition {
  key: string;
  title: string;
  description: string;
  icon?: string;
  readPermission: Permission;
  fetch: (api: ApiClient) => Promise<DashboardData>;
  kpis: (d: DashboardData) => DashboardKpi[];
  widgets: DashboardWidget[];
}
