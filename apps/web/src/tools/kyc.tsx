import { type KycCase } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";
import { Badge, riskTone, statusTone } from "../platform/badges";

// KYC Review Queue — reviewing customer identity verification requests.
export const kycTool: ToolDefinition<KycCase> = {
  key: "kyc",
  title: "KYC Review Queue",
  description: "Review customer identity verification requests. Every decision requires a note and is audited.",
  icon: "◎",
  readPermission: "kyc.read",
  getRowId: (c) => c.id,
  filters: [
    { type: "search", key: "q", placeholder: "Search name, email, id…" },
    {
      type: "select",
      key: "status",
      label: "Status",
      options: ["pending", "approved", "rejected", "escalated"].map((v) => ({ value: v, label: v })),
    },
    {
      type: "select",
      key: "risk",
      label: "Risk",
      options: ["low", "medium", "high"].map((v) => ({ value: v, label: v })),
    },
  ],
  columns: [
    { key: "id", header: "Case", render: (c) => <code>{c.id}</code>, width: "10%" },
    { key: "customerName", header: "Customer" },
    { key: "country", header: "Country", width: "8%" },
    { key: "documentType", header: "Document" },
    { key: "risk", header: "Risk", render: (c) => <Badge tone={riskTone(c.risk)}>{c.risk}</Badge>, width: "8%" },
    { key: "status", header: "Status", render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge>, width: "10%" },
    { key: "reviewerNote", header: "Note", render: (c) => c.reviewerNote ?? <span className="muted">—</span> },
  ],
  fetchList: (api, filters) => api.get<KycCase[]>(`/kyc${buildQuery(filters)}`),
  rowActions: [
    {
      key: "review",
      label: "Review",
      variant: "primary",
      permission: "kyc.decide",
      visible: (c) => c.status === "pending" || c.status === "escalated",
      fields: [
        {
          type: "select",
          name: "decision",
          label: "Decision",
          required: true,
          options: [
            { value: "approved", label: "Approve" },
            { value: "rejected", label: "Reject" },
            { value: "escalated", label: "Escalate" },
          ],
        },
        { type: "textarea", name: "note", label: "Reviewer note", required: true, placeholder: "Reason for this decision (required)…" },
      ],
      successMessage: "KYC decision recorded.",
      onSubmit: async (api, c, values) => {
        await api.post(`/kyc/${c.id}/decision`, { decision: values.decision, note: values.note });
      },
    },
  ],
};
