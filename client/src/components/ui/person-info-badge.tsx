import { InfoBadge } from "@/components/ui/info-badge";
import type { InfoBadgePreview } from "@/components/ui/info-badge";
import type { CSSProperties } from "react";

interface PersonInfoBadgeProps {
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  lines?: Array<string | null | undefined>;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  borderColor?: string;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  avatarClassName?: string;
  avatarTextClassName?: string;
  avatarStyle?: CSSProperties;
  preview?: InfoBadgePreview;
}

const buildNameParts = (value: string | null | undefined) =>
  value?.trim().split(/\s+/).filter(Boolean) ?? [];

const getInitials = (firstName: string, lastName: string, fallbackTitle: string) => {
  let resolvedFirst = firstName.trim();
  let resolvedLast = lastName.trim();

  if (!resolvedFirst && !resolvedLast && fallbackTitle.trim()) {
    const parts = buildNameParts(fallbackTitle);
    resolvedFirst = parts[0] ?? "";
    resolvedLast = parts.length > 1 ? parts[parts.length - 1] : "";
  }

  const initials = [resolvedFirst, resolvedLast]
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("");

  return initials || "?";
};

export function PersonInfoBadge({
  firstName,
  lastName,
  title,
  lines,
  testId,
  size = "default",
  fullWidth = false,
  borderColor,
  action,
  onAdd,
  onRemove,
  avatarClassName,
  avatarTextClassName,
  avatarStyle,
  preview,
}: PersonInfoBadgeProps) {
  const resolvedFirstName = firstName?.trim() ?? "";
  const resolvedLastName = lastName?.trim() ?? "";
  const resolvedTitle =
    title?.trim() ||
    [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ") ||
    "Unbekannt";
  const resolvedLines = (lines ?? []).filter((line) => line && line.trim().length > 0);
  const initials = getInitials(resolvedFirstName, resolvedLastName, resolvedTitle);
  const avatarSizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-sm";
  const titleTextClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <InfoBadge
      icon={(
        <div
          className={`flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground ${avatarSizeClass} ${avatarClassName ?? ""}`}
          style={avatarStyle}
          data-testid={testId ? `${testId}-avatar` : undefined}
        >
          <span className={`font-semibold ${avatarTextClassName ?? ""}`}>{initials}</span>
        </div>
      )}
      label={(
        <div className="flex flex-col leading-tight">
          <span className={titleTextClass}>{resolvedTitle}</span>
          {resolvedLines.map((line, index) => (
            <span key={`${line}-${index}`} className="text-xs text-muted-foreground">
              {line}
            </span>
          ))}
        </div>
      )}
      borderColor={borderColor}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      preview={preview}
    />
  );
}
