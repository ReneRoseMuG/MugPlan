import { PersonInfoBadge } from "@/components/ui/person-info-badge";
import type { EmployeeBadgeData } from "@/components/ui/badge-preview-registry";

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
}: EmployeeInfoBadgeProps) {
  const resolvedFullName =
    fullName?.trim() ||
    [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") ||
    "Unbekannter Mitarbeiter";

  const sessionKey = resolvedFullName || "employee-unknown";
  const backgroundColor = id != null
    ? getDeterministicColor(String(id))
    : getSessionColor(sessionKey);

  const lines = [
    tourName ? `Tour: ${tourName}` : null,
    teamName ? `Team: ${teamName}` : null,
  ];

  const badgeData: EmployeeBadgeData = {
    id: id ?? null,
    fullName: resolvedFullName,
    teamName: teamName ?? null,
    tourName: tourName ?? null,
  };

  return (
    <PersonInfoBadge
      firstName={firstName}
      lastName={lastName}
      title={resolvedFullName}
      lines={lines}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      avatarClassName="text-white border-transparent"
      avatarStyle={{ backgroundColor }}
      badgeType="employee"
      badgeData={badgeData}
    />
  );
}
