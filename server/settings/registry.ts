export type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";
export type CanonicalRoleKey = "LESER" | "DISPONENT" | "ADMIN";
export type SettingScopeType = "GLOBAL" | "ROLE" | "USER";
export type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

export type EnumSettingDefinition<TValue extends string> = {
  key: string;
  label: string;
  description: string;
  type: "enum";
  options: readonly TValue[];
  defaultValue: TValue;
  allowedScopes: readonly SettingScopeType[];
  validate: (value: unknown) => value is TValue;
};

export type SettingDefinition = EnumSettingDefinition<string>;

const attachmentPreviewSizeOptions = ["small", "medium", "large"] as const;
type AttachmentPreviewSize = (typeof attachmentPreviewSizeOptions)[number];

export const userSettingsRegistry = {
  attachmentPreviewSize: {
    key: "attachmentPreviewSize",
    label: "Datei Vorschau Groesse",
    description: "Steuert die Groesse der Dateivorschau im Attachment-Badge.",
    type: "enum",
    options: attachmentPreviewSizeOptions,
    defaultValue: "medium",
    allowedScopes: ["GLOBAL", "ROLE", "USER"],
    validate: (value: unknown): value is AttachmentPreviewSize =>
      typeof value === "string" && attachmentPreviewSizeOptions.includes(value as AttachmentPreviewSize),
  },
} as const satisfies Record<string, SettingDefinition>;

export type UserSettingKey = keyof typeof userSettingsRegistry;
export type UserSettingValueByKey = {
  [K in UserSettingKey]: (typeof userSettingsRegistry)[K]["defaultValue"];
};

export const settingDefinitions = Object.values(userSettingsRegistry);

export const globalScopeMarker = "global" as const;

export function mapDbRoleCodeToCanonicalRole(dbRoleCode: DbRoleCode): CanonicalRoleKey {
  if (dbRoleCode === "READER") return "LESER";
  if (dbRoleCode === "DISPATCHER") return "DISPONENT";
  return "ADMIN";
}

export function assertDbRoleCode(input: string): DbRoleCode | null {
  if (input === "READER" || input === "DISPATCHER" || input === "ADMIN") {
    return input;
  }
  return null;
}
