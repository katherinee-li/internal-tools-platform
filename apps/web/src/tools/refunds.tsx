import { REFUND_REASONS, type Transaction } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";
import { Badge, statusTone } from "../platform/badges";
import { money } from "../platform/format";

const remaining = (t: Transaction) => t.amount - t.refundedAmount;

// Refund Dashboard — search transactions and issue validated refunds.
export const refundsTool: ToolDefinition<Transaction> = {
  key: "refunds",
  title: "Refund Dashboard",
  description: "Search transactions and issue refunds. Refunds are validated, confirmed, and audited.",
  icon: "↩",
  readPermission: "refund.read",
  getRowId: (t) => t.id,
  filters: [
    { type: "search", key: "q", placeholder: "Search name, email, id…" },
    {
      type: "select",
      key: "status",
      label: "Status",
      options: ["settled", "pending", "failed"].map((v) => ({ value: v, label: v })),
    },
  ],
  columns: [
    { key: "id", header: "Transaction", render: (t) => <code>{t.id}</code>, width: "12%" },
    { key: "customerName", header: "Customer" },
    { key: "amount", header: "Amount", render: (t) => money(t.amount, t.currency), width: "11%" },
    { key: "refundedAmount", header: "Refunded", render: (t) => money(t.refundedAmount, t.currency), width: "11%" },
    { key: "remaining", header: "Refundable", render: (t) => money(remaining(t), t.currency), width: "11%" },
    { key: "status", header: "Status", render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge>, width: "10%" },
  ],
  fetchList: (api, filters) => api.get<Transaction[]>(`/refunds/transactions${buildQuery(filters)}`),
  rowActions: [
    {
      key: "refund",
      label: "Issue refund",
      variant: "primary",
      permission: "refund.issue",
      visible: (t) => t.status === "settled" && remaining(t) > 0,
      confirm: (t) => `Refund transaction ${t.id} for ${t.customerName}. Refundable up to ${money(remaining(t), t.currency)}.`,
      initialValues: (t) => ({ amount: (remaining(t) / 100).toFixed(2) }),
      fields: [
        { type: "number", name: "amount", label: "Amount", required: true, min: 0, help: "In dollars" },
        {
          type: "select",
          name: "reason",
          label: "Reason",
          required: true,
          options: REFUND_REASONS.map((r) => ({ value: r, label: r.replace(/_/g, " ") })),
        },
        { type: "textarea", name: "note", label: "Note (optional)", placeholder: "Additional context…" },
      ],
      successMessage: "Refund issued.",
      onSubmit: async (api, t, values) => {
        await api.post("/refunds", {
          transactionId: t.id,
          amount: Math.round(Number(values.amount) * 100),
          reason: values.reason,
          note: values.note || undefined,
        });
      },
    },
  ],
};
