import React from "react";
import { useSetting } from "@/hooks/useSettings";

interface EntityFormShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  sidebarWidth?: number;
  contentMaxWidth?: number;
  className?: string;
  mainClassName?: string;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function EntityFormShell({
  header,
  sidebar,
  footer,
  children,
  sidebarWidth,
  contentMaxWidth,
  className,
  mainClassName,
}: EntityFormShellProps) {
  const resolvedSidebarWidth = useSetting("entityFormShell.sidebarWidthPx");
  const resolvedContentMaxWidth = useSetting("entityFormShell.contentMaxWidthPx");
  const effectiveSidebarWidth = sidebarWidth ?? resolvedSidebarWidth ?? 360;
  const effectiveContentMaxWidth = contentMaxWidth ?? resolvedContentMaxWidth ?? 960;
  const sidebarFooterRef = React.useRef<HTMLDivElement | null>(null);
  const [sidebarFooterHeight, setSidebarFooterHeight] = React.useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!sidebar) {
      setSidebarFooterHeight(0);
      return;
    }

    const footerNode = sidebarFooterRef.current;
    if (!footerNode) {
      setSidebarFooterHeight(0);
      return;
    }

    const updateSidebarFooterHeight = () => {
      const nextHeight = Math.ceil(footerNode.getBoundingClientRect().height);
      setSidebarFooterHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
    };

    updateSidebarFooterHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateSidebarFooterHeight();
    });

    resizeObserver.observe(footerNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [effectiveSidebarWidth, footer, sidebar]);

  return (
    <div
      data-testid="entity-form-shell"
      className={`flex h-full min-h-0 w-full flex-col${className ? ` ${className}` : ""}`}
    >
      {header && (
        <div
          data-testid="entity-form-shell-header"
          className="sticky top-0 z-10 flex-shrink-0 bg-[hsl(var(--color-beige))] border-b border-[hsl(var(--color-border))]"
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
          className={`flex-1 min-h-0 overflow-y-auto${mainClassName ? ` ${mainClassName}` : ""}`}
        >
          <div
            data-testid="entity-form-shell-main-inner"
            className="mx-auto h-full w-full px-6 py-6"
            style={{ maxWidth: effectiveContentMaxWidth }}
          >
            {children}
          </div>
        </div>

        {sidebar && (
          <div
            data-testid="entity-form-shell-sidebar"
            className="relative flex min-h-0 flex-shrink-0 overflow-hidden border-l border-[hsl(var(--color-border))] bg-[hsl(var(--color-cream))]"
            style={{ width: effectiveSidebarWidth }}
          >
            <div
              data-testid="entity-form-shell-sidebar-scroll"
              className="visible-vertical-scrollbar min-h-0 flex-1 overflow-y-auto"
              style={sidebarFooterHeight > 0 ? { paddingBottom: sidebarFooterHeight } : undefined}
            >
              {sidebar}
            </div>
            <div
              ref={sidebarFooterRef}
              data-testid="entity-form-shell-footer"
              className="absolute inset-x-0 bottom-0 z-10 border-t border-[hsl(var(--color-border))] bg-[hsl(var(--color-beige))]"
            >
              {footer}
            </div>
          </div>
        )}
      </div>

      {!sidebar && (
        <div
          data-testid="entity-form-shell-footer"
          className="sticky bottom-0 z-10 flex-shrink-0 bg-[hsl(var(--color-beige))] border-t border-[hsl(var(--color-border))]"
        >
          {footer}
        </div>
      )}
    </div>
  );
}
