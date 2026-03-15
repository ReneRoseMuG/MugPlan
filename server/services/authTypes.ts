import type { DbRoleCode } from "../settings/registry";

export type AuthenticatedPayload = {
  status: "authenticated";
  userId: number;
  username: string;
  roleCode: DbRoleCode;
  monitoringSummary?: {
    count: number;
    triggerNames: string[];
  };
};

export type TwoFactorSetupRequiredPayload = {
  status: "2fa_setup_required";
  username: string;
  manualEntryKey: string;
  qrCodeDataUrl: string;
};

export type TwoFactorRequiredPayload = {
  status: "2fa_required";
  username: string;
};

export type AuthLoginPayload =
  | AuthenticatedPayload
  | TwoFactorSetupRequiredPayload
  | TwoFactorRequiredPayload;

export type AuthPreSessionState = {
  userId: number;
  username: string;
  roleCode: DbRoleCode;
  mode: "setup" | "verify";
  createdAt: number;
  pendingSecret?: string;
};
