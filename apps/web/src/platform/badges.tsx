import React from "react";

export type Tone = "green" | "red" | "amber" | "gray" | "blue";

// Small reusable status pill used across every tool for consistent status UI.
export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// Convenience mappers so tools render domain statuses consistently.
export function statusTone(status: string): Tone {
  switch (status) {
    case "approved":
    case "settled":
    case "resolved":
      return "green";
    case "rejected":
    case "failed":
      return "red";
    case "escalated":
    case "pending":
    case "open":
      return "amber";
    default:
      return "gray";
  }
}

export function riskTone(risk: string): Tone {
  return risk === "high" ? "red" : risk === "medium" ? "amber" : "green";
}
