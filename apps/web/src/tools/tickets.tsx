import { type SupportTicket } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";
import { Badge, statusTone } from "../platform/badges";

const priorityTone = (p: string) => (p === "high" ? "red" : p === "medium" ? "amber" : "gray");

// Support Ticket Queue — added as the "fourth tool" experiment to measure the
// marginal cost of a new internal tool on the shared platform.
export const ticketsTool: ToolDefinition<SupportTicket> = {
  key: "tickets",
  title: "Support Ticket Queue",
  description: "Triage customer support tickets. Status changes are audited.",
  icon: "✉",
  readPermission: "ticket.read",
  getRowId: (t) => t.id,
  filters: [
    { type: "search", key: "q", placeholder: "Search subject, customer, id…" },
    { type: "select", key: "status", label: "Status", options: ["open", "pending", "resolved"].map((v) => ({ value: v, label: v })) },
    { type: "select", key: "priority", label: "Priority", options: ["low", "medium", "high"].map((v) => ({ value: v, label: v })) },
  ],
  columns: [
    { key: "id", header: "Ticket", render: (t) => <code>{t.id}</code>, width: "10%" },
    { key: "subject", header: "Subject" },
    { key: "customerName", header: "Customer" },
    { key: "priority", header: "Priority", render: (t) => <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>, width: "10%" },
    { key: "status", header: "Status", render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge>, width: "10%" },
  ],
  fetchList: (api, filters) => api.get<SupportTicket[]>(`/tickets${buildQuery(filters)}`),
  rowActions: [
    {
      key: "update",
      label: "Update",
      variant: "primary",
      permission: "ticket.write",
      initialValues: (t) => ({ status: t.status }),
      fields: [
        {
          type: "select",
          name: "status",
          label: "Status",
          required: true,
          options: ["open", "pending", "resolved"].map((v) => ({ value: v, label: v })),
        },
        { type: "textarea", name: "note", label: "Note (optional)", placeholder: "Internal note…" },
      ],
      successMessage: "Ticket updated.",
      onSubmit: async (api, t, values) => {
        await api.patch(`/tickets/${t.id}`, { status: values.status, note: values.note || undefined });
      },
    },
  ],
};
