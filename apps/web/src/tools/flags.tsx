import { ENVIRONMENTS, type FeatureFlag } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";
import { Badge } from "../platform/badges";

// Feature Flag Administration — the reference implementation that establishes
// the pattern child sessions follow for KYC and Refunds.
export const flagsTool: ToolDefinition<FeatureFlag> = {
  key: "flags",
  title: "Feature Flag Administration",
  description: "View and modify feature flags per environment. Production changes are Admin-only.",
  icon: "⚑",
  readPermission: "flag.read",
  getRowId: (f) => `${f.environment}/${f.key}`,
  filters: [{ type: "search", key: "q", placeholder: "Search flags…" }],
  toolbar: ({ filters, setFilter }) => (
    <div className="toolbar">
      <label className="filter-select">
        <span>Environment</span>
        <select
          className="input"
          value={filters.environment ?? "development"}
          onChange={(e) => setFilter("environment", e.target.value)}
        >
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
      </label>
      {(filters.environment ?? "development") === "production" && (
        <span className="prod-warning">⚠ Production — changes require Admin</span>
      )}
    </div>
  ),
  columns: [
    { key: "key", header: "Flag", render: (f) => <code>{f.key}</code>, width: "22%" },
    { key: "description", header: "Description" },
    {
      key: "enabled",
      header: "Enabled",
      render: (f) => <Badge tone={f.enabled ? "green" : "gray"}>{f.enabled ? "on" : "off"}</Badge>,
      width: "10%",
    },
    { key: "rolloutPercentage", header: "Rollout", render: (f) => `${f.rolloutPercentage}%`, width: "10%" },
  ],
  fetchList: (api, filters) => {
    const environment = filters.environment || "development";
    return api.get<FeatureFlag[]>(`/flags${buildQuery({ ...filters, environment })}`);
  },
  rowActions: [
    {
      key: "edit",
      label: "Edit",
      submitLabel: "Confirm",
      variant: "primary",
      // Production writes require the dedicated production permission (Admin).
      permission: (flag) => (flag.environment === "production" ? "flag.write.production" : "flag.write"),
      confirm: (flag) =>
        flag.environment === "production"
          ? `You are editing a PRODUCTION flag ("${flag.key}"). This affects live traffic.`
          : undefined,
      // Production changes require an explicit, mandatory acknowledgement — a
      // distinct extra step other environments do not have.
      requireAck: (flag) =>
        flag.environment === "production"
          ? "I understand this changes a PRODUCTION flag affecting live traffic."
          : undefined,
      initialValues: (flag) => ({
        enabled: String(flag.enabled),
        rolloutPercentage: String(flag.rolloutPercentage),
      }),
      fields: [
        {
          type: "select",
          name: "enabled",
          label: "Enabled",
          required: true,
          options: [
            { value: "true", label: "On" },
            { value: "false", label: "Off" },
          ],
        },
        { type: "number", name: "rolloutPercentage", label: "Rollout %", required: true, min: 0, max: 100, help: "0–100" },
      ],
      successMessage: "Feature flag updated.",
      onSubmit: async (api, flag, values) => {
        const enabled = values.enabled === "true";
        // A disabled flag has no rollout — force it to 0.
        await api.patch(`/flags/${flag.environment}/${flag.key}`, {
          enabled,
          rolloutPercentage: enabled ? Number(values.rolloutPercentage) : 0,
        });
      },
    },
  ],
};
