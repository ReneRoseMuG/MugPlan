import React from "react";

interface EntityFormShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  sidebarWidth?: number;
  className?: string;
}

export function EntityFormShell({
  header,
  sidebar,
  footer,
  children,
  sidebarWidth,
  className,
}: EntityFormShellProps) {
  return (
    <div
      data-testid="entity-form-shell"
      className={`flex flex-col h-full min-h-0${className ? ` ${className}` : ""}`}
    >
      {header && (
        <div
          data-testid="entity-form-shell-header"
          className="flex-shrink-0 bg-[hsl(var(--color-beige))] border-b border-[hsl(var(--color-border))]"
        >
          {header}
        </div>
      )}

      <div
        data-testid="entity-form-shell-middle"
        className="flex flex-1 min-h-0 overflow-hidden"
      >
        <div
          data-testid="entity-form-shell-main"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {children}
        </div>

        {sidebar && (
          <div
            data-testid="entity-form-shell-sidebar"
            className="overflow-y-auto flex-shrink-0 border-l-2 border-l-[hsl(var(--color-blue-dark))]"
            style={{ width: sidebarWidth ?? 240 }}
          >
            {sidebar}
          </div>
        )}
      </div>

      <div
        data-testid="entity-form-shell-footer"
        className="flex-shrink-0 bg-[hsl(var(--color-beige))] border-t border-[hsl(var(--color-border))]"
      >
        {footer}
      </div>
    </div>
  );
}
