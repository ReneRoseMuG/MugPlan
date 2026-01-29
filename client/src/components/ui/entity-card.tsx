import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { defaultHeaderColor } from "@/lib/colors";

interface EntityCardProps {
  title: string;
  icon?: ReactNode;
  headerColor?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
  style?: React.CSSProperties;
  onDoubleClick?: () => void;
}

export function EntityCard({
  title,
  icon,
  headerColor = defaultHeaderColor,
  onDelete,
  isDeleting,
  actions,
  footer,
  children,
  testId,
  className = "",
  style,
  onDoubleClick,
}: EntityCardProps) {
  const borderStyle = style?.borderLeftColor 
    ? { borderLeftColor: style.borderLeftColor } 
    : undefined;
  const hasBorderColor = !!style?.borderLeftColor;

  return (
    <div
      className={`rounded-lg border border-border bg-white overflow-hidden transition-all hover:border-primary/50 hover:shadow-md cursor-pointer flex flex-col ${hasBorderColor ? 'border-l-[5px]' : ''} ${className}`}
      style={borderStyle}
      data-testid={testId}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="px-4 py-2 border-b border-border flex items-center justify-between gap-2"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="flex-shrink-0 text-slate-600">{icon}</span>}
          <span className="font-semibold text-slate-700 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              data-testid={testId ? `button-delete-${testId}` : undefined}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 flex-1">{children}</div>
      {footer && (
        <div className="px-4 py-2 border-t border-border bg-slate-50 flex items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}
