import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface EntityFormTabDefinition {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  visible?: boolean;
  triggerTestId?: string;
  contentTestId?: string;
}

export interface EntityFormWithTabsLayoutProps {
  title: string;
  icon: ReactNode;
  tabs: EntityFormTabDefinition[];
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  onSubmit?: () => Promise<void>;
  closeOnSubmitSuccess?: boolean;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  testIdPrefix?: string;
  footerActions?: ReactNode;
  defaultTabId?: string;
  activeTabId?: string;
  onActiveTabChange?: (nextTabId: string, prevTabId: string | null) => void;
  keepMounted?: boolean;
}

export function EntityFormWithTabsLayout({
  title,
  icon,
  tabs,
  onClose,
  onCancel,
  onSave,
  onSubmit,
  closeOnSubmitSuccess = true,
  isSaving = false,
  saveLabel = "Speichern",
  cancelLabel = "Abbrechen",
  testIdPrefix = "entity",
  footerActions,
  defaultTabId,
  activeTabId,
  onActiveTabChange,
  keepMounted = true,
}: EntityFormWithTabsLayoutProps) {
  const visibleTabs = useMemo(() => tabs.filter((tab) => tab.visible !== false), [tabs]);

  const visibleTabIds = useMemo(() => new Set(visibleTabs.map((tab) => tab.id)), [visibleTabs]);
  const firstVisibleTabId = visibleTabs[0]?.id ?? null;

  const resolveVisibleTabId = (candidate?: string | null): string | null => {
    if (candidate && visibleTabIds.has(candidate)) return candidate;
    return firstVisibleTabId;
  };

  const isControlled = typeof activeTabId === "string";
  const [internalActiveTabId, setInternalActiveTabId] = useState<string | null>(() =>
    resolveVisibleTabId(defaultTabId),
  );

  useEffect(() => {
    if (isControlled) return;
    setInternalActiveTabId((previous) => {
      const next = resolveVisibleTabId(previous);
      if (next) return next;
      return resolveVisibleTabId(defaultTabId);
    });
  }, [defaultTabId, isControlled, visibleTabIds, firstVisibleTabId]);

  const currentActiveTabId = isControlled
    ? resolveVisibleTabId(activeTabId)
    : resolveVisibleTabId(internalActiveTabId);

  const handleTabChange = (nextTabId: string) => {
    const previousTabId = currentActiveTabId;
    if (!isControlled) {
      setInternalActiveTabId(nextTabId);
    }
    if (nextTabId !== previousTabId) {
      onActiveTabChange?.(nextTabId, previousTabId);
    }
  };

  return (
    <EntityFormLayout
      title={title}
      icon={icon}
      onClose={onClose}
      onCancel={onCancel}
      onSave={onSave}
      onSubmit={onSubmit}
      closeOnSubmitSuccess={closeOnSubmitSuccess}
      isSaving={isSaving}
      saveLabel={saveLabel}
      cancelLabel={cancelLabel}
      testIdPrefix={testIdPrefix}
      footerActions={footerActions}
      contentScrollMode="contained"
    >
      {visibleTabs.length === 0 ? (
        <div
          className="rounded-md border border-border bg-[hsl(var(--sub-panel-background))] px-4 py-3 text-sm text-muted-foreground"
          data-testid={`tabs-empty-${testIdPrefix}`}
        >
          Kein Tab verfuegbar
        </div>
      ) : (
        <Tabs
          value={currentActiveTabId ?? undefined}
          onValueChange={handleTabChange}
          className="flex h-full min-h-0 flex-col gap-4"
        >
          <TabsList className="flex-shrink-0 self-start">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                data-testid={tab.triggerTestId ?? `tab-trigger-${tab.id}`}
              >
                <span className="inline-flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1"
              {...(keepMounted ? { forceMount: true as const } : {})}
              data-testid={tab.contentTestId ?? `tab-content-${tab.id}`}
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </EntityFormLayout>
  );
}
