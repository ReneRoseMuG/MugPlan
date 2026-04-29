import { PersonInfoBadge } from "@/components/ui/person-info-badge";
import { createEmployeeInfoBadgePreview } from "@/components/ui/badge-previews/employee-info-badge-preview";

interface EmployeeInfoBadgeProps {
  id?: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  tourName?: string | null;
  teamName?: string | null;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  showPreview?: boolean;
  renderMode?: "compact" | "standard" | "detail";
}

const employeeBackgroundColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0ea5e9",
  "#ea580c",
];

const sessionBackgroundColors = new Map<string, string>();

const getDeterministicColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % employeeBackgroundColors.length;
  return employeeBackgroundColors[index];
};

const getSessionColor = (key: string) => {
  if (sessionBackgroundColors.has(key)) {
    return sessionBackgroundColors.get(key) as string;
  }
  const randomIndex = Math.floor(Math.random() * employeeBackgroundColors.length);
  const color = employeeBackgroundColors[randomIndex];
  sessionBackgroundColors.set(key, color);
  return color;
};

function parseFallbackFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const commaIndex = trimmed.indexOf(",");
  if (commaIndex > 0) {
    return {
      firstName: trimmed.slice(commaIndex + 1).trim(),
      lastName: trimmed.slice(0, commaIndex).trim(),
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function EmployeeInfoBadge({
  id,
  firstName,
  lastName,
  fullName,
  tourName,
  teamName,
  testId,
  size,
  fullWidth,
  action,
  onAdd,
  onRemove,
  showPreview = true,
  renderMode = "standard",
}: EmployeeInfoBadgeProps) {
  const parsedFallbackName = parseFallbackFullName(fullName);
  const resolvedFirstName = firstName?.trim() || parsedFallbackName.firstName;
  const resolvedLastName = lastName?.trim() || parsedFallbackName.lastName;
  const resolvedDetailName =
    [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ") ||
    fullName?.trim() ||
    "Unbekannter Mitarbeiter";

  const sessionKey = resolvedDetailName || "employee-unknown";
  const backgroundColor = id != null
    ? getDeterministicColor(String(id))
    : getSessionColor(sessionKey);

  const lines = [
    tourName ? `Tour: ${tourName}` : null,
    teamName ? `Team: ${teamName}` : null,
  ];

  return (
    <PersonInfoBadge
      firstName={resolvedFirstName}
      lastName={resolvedLastName}
      title={resolvedDetailName}
      lines={lines}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      avatarClassName="text-white border-transparent"
      avatarStyle={{ backgroundColor }}
      renderMode={renderMode}
      preview={showPreview ? createEmployeeInfoBadgePreview({
        fullName: resolvedDetailName,
        teamName: teamName ?? null,
        tourName: tourName ?? null,
      }) : undefined}
    />
  );
}
