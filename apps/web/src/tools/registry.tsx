import type { Permission } from "@platform/shared";
import { ToolPage } from "../platform/ToolPage";
import { kycTool } from "./kyc";
import { refundsTool } from "./refunds";
import { flagsTool } from "./flags";
import { ticketsTool } from "./tickets";
import { auditTool } from "./audit";

export interface RegisteredTool {
  path: string;
  label: string;
  icon: string;
  readPermission: Permission;
  element: React.ReactNode;
}

// The full app is a registry of tool definitions. Adding a tool = adding one
// entry here plus its definition file. This is the "next tool is cheap" claim.
export const TOOLS: RegisteredTool[] = [
  { path: "/kyc", label: "KYC Review", icon: kycTool.icon!, readPermission: kycTool.readPermission, element: <ToolPage def={kycTool} /> },
  { path: "/refunds", label: "Refunds", icon: refundsTool.icon!, readPermission: refundsTool.readPermission, element: <ToolPage def={refundsTool} /> },
  { path: "/flags", label: "Feature Flags", icon: flagsTool.icon!, readPermission: flagsTool.readPermission, element: <ToolPage def={flagsTool} /> },
  { path: "/tickets", label: "Support Tickets", icon: ticketsTool.icon!, readPermission: ticketsTool.readPermission, element: <ToolPage def={ticketsTool} /> },
  { path: "/audit", label: "Audit Log", icon: auditTool.icon!, readPermission: auditTool.readPermission, element: <ToolPage def={auditTool} /> },
];
