import type { Permission, Role } from "@platform/shared";
import type { ApiClient } from "./api";

// ---------------------------------------------------------------------------
// The tool-definition abstraction is the core of the platform.
//
// A new internal tool is (mostly) a declarative object: columns, filters, and
// actions. `ToolPage` renders any ToolDefinition into a full CRUD-style screen
// with search/filter, a reusable table, permission-gated actions, schema-driven
// forms, confirmation flows, loading/error/empty states, and toasts.
//
// This is what makes "the next tool" cheap: workflow-specific code is limited to
// the fetch/submit callbacks + column/filter/action config.
// ---------------------------------------------------------------------------

export interface ColumnDef<Row> {
  key: string;
  header: string;
  render?: (row: Row) => React.ReactNode;
  width?: string;
}

export type FilterDef =
  | { type: "search"; key: string; placeholder?: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] };

export type FormFieldDef =
  | { type: "text"; name: string; label: string; required?: boolean; placeholder?: string }
  | { type: "textarea"; name: string; label: string; required?: boolean; placeholder?: string }
  | { type: "number"; name: string; label: string; required?: boolean; min?: number; max?: number; help?: string }
  | { type: "select"; name: string; label: string; required?: boolean; options: { value: string; label: string }[] };

export interface ActionDef<Row> {
  key: string;
  label: string;
  // Permission required to even see/enable the action.
  permission: Permission | ((row: Row, role: Role) => Permission);
  variant?: "primary" | "danger" | "default";
  // Show this action for a given row (e.g. only pending KYC cases).
  visible?: (row: Row) => boolean;
  // Fields collected in a modal form before submitting. Empty => confirm-only.
  fields?: FormFieldDef[];
  // Prefill form values from the row (e.g. current flag state).
  initialValues?: (row: Row) => Record<string, string>;
  // Extra confirmation copy; presence forces a confirm step.
  confirm?: (row: Row, values: Record<string, string>) => string | undefined;
  // The only workflow-specific write logic.
  onSubmit: (api: ApiClient, row: Row, values: Record<string, string>) => Promise<void>;
  successMessage?: string;
}

export interface ToolDefinition<Row = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  icon?: string;
  readPermission: Permission;
  getRowId: (row: Row) => string;
  columns: ColumnDef<Row>[];
  filters?: FilterDef[];
  // Optional toolbar controls rendered above the table (e.g. environment picker).
  toolbar?: (ctx: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => React.ReactNode;
  fetchList: (api: ApiClient, filters: Record<string, string>) => Promise<Row[]>;
  rowActions?: ActionDef<Row>[];
}
