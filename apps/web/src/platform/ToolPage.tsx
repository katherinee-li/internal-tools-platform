import { useCallback, useEffect, useMemo, useState } from "react";
import type { Permission, Role } from "@platform/shared";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import { useToast } from "./toast";
import { DataTable, EmptyState, ErrorState, Loading, Modal, SearchFilterBar, ActionForm } from "./components";
import type { ActionDef, ToolDefinition } from "./toolDefinition";

function resolvePermission<Row>(action: ActionDef<Row>, row: Row, role: Role): Permission {
  return typeof action.permission === "function" ? action.permission(row, role) : action.permission;
}

// Generic renderer for ANY tool definition. This single component provides the
// full screen: search/filter, table, permission-gated row actions, forms,
// confirmation, loading/error/empty, refetch, and toasts.
export function ToolPage<Row>({ def }: { def: ToolDefinition<Row> }) {
  const { api, can, role } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const [active, setActive] = useState<{ action: ActionDef<Row>; row: Row } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const setFilter = useCallback((k: string, v: string) => setFilters((f) => ({ ...f, [k]: v })), []);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    def
      .fetchList(api, filters)
      .then((r) => setRows(r))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load data."))
      .finally(() => setLoading(false));
  }, [api, def, filters]);

  useEffect(() => {
    const t = setTimeout(load, 150); // debounce filter/search
    return () => clearTimeout(t);
  }, [load]);

  const canRead = can(def.readPermission);

  const runAction = (values: Record<string, string>) => {
    if (!active) return;
    setSubmitting(true);
    setFormError(undefined);
    active.action
      .onSubmit(api, active.row, values)
      .then(() => {
        toast.success(active.action.successMessage ?? "Done.");
        setActive(null);
        load();
      })
      .catch((e: unknown) => {
        const msg = e instanceof ApiError ? e.message : "Action failed.";
        setFormError(msg);
        toast.error(msg);
      })
      .finally(() => setSubmitting(false));
  };

  const renderActions = useMemo(() => {
    if (!def.rowActions || def.rowActions.length === 0) return undefined;
    return (row: Row) => (
      <div className="row-actions">
        {def.rowActions!.map((action) => {
          if (action.visible && !action.visible(row)) return null;
          const permission = resolvePermission(action, row, role);
          const allowed = can(permission);
          return (
            <button
              key={action.key}
              className={`btn btn-sm btn-${action.variant ?? "default"}`}
              disabled={!allowed}
              title={allowed ? undefined : `Requires ${permission}`}
              onClick={() => {
                setFormError(undefined);
                setActive({ action, row });
              }}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    );
  }, [def.rowActions, can, role]);

  const activeConfirm = active?.action.confirm?.(active.row, {});

  return (
    <div className="tool-page">
      <header className="tool-header">
        <div>
          <h1>{def.title}</h1>
          <p className="muted">{def.description}</p>
        </div>
      </header>

      {def.toolbar?.({ filters, setFilter })}
      {def.filters && <SearchFilterBar filters={def.filters} values={filters} onChange={setFilter} />}

      {!canRead ? (
        <ErrorState message="You do not have permission to view this tool." />
      ) : loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable columns={def.columns} rows={rows} getRowId={def.getRowId} renderActions={renderActions} />
      )}

      {active && (
        <Modal title={active.action.label} onClose={() => setActive(null)}>
          <ActionForm
            fields={active.action.fields ?? []}
            initialValues={active.action.initialValues?.(active.row)}
            confirmMessage={activeConfirm}
            submitLabel={active.action.label}
            submitting={submitting}
            errorMessage={formError}
            onSubmit={runAction}
            onCancel={() => setActive(null)}
          />
        </Modal>
      )}
    </div>
  );
}
