import { PersonInfoBadge } from "@/components/ui/person-info-badge";
import type { CustomerBadgeData } from "@/components/ui/badge-preview-registry";

interface CustomerInfoBadgeProps {
  id?: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  customerNumber?: string | null;
  phone?: string | null;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
}

const customerBorderColors = [
  "#f97316",
  "#0ea5e9",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#eab308",
];

const sessionBorderColors = new Map<string, string>();

const getDeterministicColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % customerBorderColors.length;
  return customerBorderColors[index];
};

const getSessionColor = (key: string) => {
  if (sessionBorderColors.has(key)) {
    return sessionBorderColors.get(key) as string;
  }
  const randomIndex = Math.floor(Math.random() * customerBorderColors.length);
  const color = customerBorderColors[randomIndex];
  sessionBorderColors.set(key, color);
  return color;
};

export function CustomerInfoBadge({
  id,
  firstName,
  lastName,
  fullName,
  customerNumber,
  phone,
  testId,
  size,
  fullWidth,
  action,
  onAdd,
  onRemove,
}: CustomerInfoBadgeProps) {
  const resolvedFullName =
    fullName?.trim() ||
    [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") ||
    "Unbekannter Kunde";

  const sessionKey =
    resolvedFullName || customerNumber || phone || "customer-unknown";
  const borderColor = id != null
    ? getDeterministicColor(String(id))
    : getSessionColor(sessionKey);

  const lines = [
    customerNumber ? `Kundennr.: ${customerNumber}` : null,
    phone ? `Tel.: ${phone}` : null,
  ];

  const badgeData: CustomerBadgeData = {
    id: id ?? null,
    fullName: resolvedFullName,
    customerNumber: customerNumber ?? null,
    phone: phone ?? null,
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
      avatarClassName="border-2 bg-slate-200 text-slate-700"
      avatarStyle={{ borderColor }}
      badgeType="customer"
      badgeData={badgeData}
    />
  );
}
