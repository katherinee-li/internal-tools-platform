import React, { useState } from "react";
import type { ColumnDef, FilterDef, FormFieldDef } from "./toolDefinition";

// ---- Loading / Error / Empty states (reusable) ---------------------------

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="state state-loading">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label = "No results." }: { label?: string }) {
  return <div className="state state-empty">{label}</div>;
}

// ---- DataTable ------------------------------------------------------------

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  actionsHeader,
  renderActions,
}: {
  columns: ColumnDef<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  actionsHeader?: string;
  renderActions?: (row: Row) => React.ReactNode;
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={c.width ? { width: c.width } : undefined}>
              {c.header}
            </th>
          ))}
          {renderActions && <th>{actionsHeader ?? "Actions"}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowId(row)}>
            {columns.map((c) => (
              <td key={c.key}>
                {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
              </td>
            ))}
            {renderActions && <td className="actions-cell">{renderActions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- SearchFilterBar ------------------------------------------------------

export function SearchFilterBar({
  filters,
  values,
  onChange,
}: {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="filter-bar">
      {filters.map((f) =>
        f.type === "search" ? (
          <input
            key={f.key}
            className="input"
            type="search"
            placeholder={f.placeholder ?? "Search…"}
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
          />
        ) : (
          <label key={f.key} className="filter-select">
            <span>{f.label}</span>
            <select className="input" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}>
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ),
      )}
    </div>
  );
}

// ---- Modal + schema-driven Form + Confirm --------------------------------

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// A schema-driven form. Renders fields from FormFieldDef[], does required-field
// validation, and returns collected values on submit.
export function ActionForm({
  fields,
  initialValues,
  confirmMessage,
  ackLabel,
  submitLabel,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: {
  fields: FormFieldDef[];
  initialValues?: Record<string, string>;
  confirmMessage?: string;
  ackLabel?: string;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const initial: Record<string, string> = {};
  for (const f of fields) initial[f.name] = initialValues?.[f.name] ?? "";
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [acked, setAcked] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? "").trim()) {
        setLocalError(`${f.label} is required.`);
        return;
      }
    }
    if (ackLabel && !acked) {
      setLocalError("Please confirm the checkbox to proceed.");
      return;
    }
    setLocalError(undefined);
    onSubmit(values);
  };

  return (
    <form onSubmit={submit} className="action-form">
      {confirmMessage && <p className="confirm-message">{confirmMessage}</p>}
      {fields.map((f) => (
        <label key={f.name} className="field">
          <span>
            {f.label}
            {f.required && <em className="req">*</em>}
          </span>
          {f.type === "textarea" ? (
            <textarea className="input" value={values[f.name] ?? ""} placeholder={"placeholder" in f ? f.placeholder : ""} onChange={(e) => set(f.name, e.target.value)} />
          ) : f.type === "select" ? (
            <select className="input" value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}>
              <option value="">Select…</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              type={f.type === "number" ? "number" : "text"}
              value={values[f.name] ?? ""}
              placeholder={"placeholder" in f ? f.placeholder : ""}
              min={f.type === "number" ? f.min : undefined}
              max={f.type === "number" ? f.max : undefined}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
          {f.type === "number" && "help" in f && f.help && <small className="help">{f.help}</small>}
        </label>
      ))}
      {ackLabel && (
        <label className="ack-check">
          <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} />
          <span>{ackLabel}</span>
        </label>
      )}
      {(localError || errorMessage) && <div className="form-error" role="alert">{localError ?? errorMessage}</div>}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting || (!!ackLabel && !acked)}>
          {submitting ? "Working…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
