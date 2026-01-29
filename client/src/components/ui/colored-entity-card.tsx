import { EntityCard } from "@/components/ui/entity-card";
import type { ReactNode } from "react";

interface ColoredEntityCardProps {
  title: string;
  icon?: ReactNode;
  headerColor?: string;
  borderColor?: string | null;
  onDelete?: () => void;
  isDeleting?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
  onDoubleClick?: () => void;
}

export function ColoredEntityCard({
  title,
  icon,
  headerColor,
  borderColor,
  onDelete,
  isDeleting,
  actions,
  footer,
  children,
  testId,
  className = "",
  onDoubleClick,
}: ColoredEntityCardProps) {
  const style = borderColor 
    ? { borderLeftWidth: '5px', borderLeftColor: borderColor } 
    : undefined;

  return (
    <EntityCard
      title={title}
      icon={icon}
      headerColor={headerColor}
      onDelete={onDelete}
      isDeleting={isDeleting}
      actions={actions}
      footer={footer}
      testId={testId}
      className={className}
      style={style}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </EntityCard>
  );
}
