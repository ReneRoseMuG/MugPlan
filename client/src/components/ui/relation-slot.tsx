import React, { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export type RelationSlotState = "active" | "empty" | "readonly";

export interface RelationSlotProps {
  title: string;
  icon: ReactNode;
  state: RelationSlotState;
  onAdd?: () => void;
  onRemove?: () => void;
  addLabel?: string;
  emptyText?: string;
  children?: ReactNode;
  testId?: string;
  addActionTestId?: string;
  removeActionTestId?: string;
}

export function RelationSlot({
  title,
  icon,
  state,
  onAdd,
  onRemove,
  addLabel = "Zuordnen",
  emptyText = "Keine Zuordnung vorhanden",
  children,
  testId,
  addActionTestId,
  removeActionTestId,
}: RelationSlotProps) {
  const canAdd = state === "empty" && !!onAdd;
  const canRemove = state === "active" && !!onRemove;

  return (
    <section className="sub-panel flex flex-col gap-4" data-testid={testId}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0 min-h-8">
          {canAdd && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onAdd}
              data-testid={addActionTestId ?? (testId ? `${testId}-action-add` : undefined)}
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">{addLabel}</span>
            </Button>
          )}
          {canRemove && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onRemove}
              data-testid={removeActionTestId ?? (testId ? `${testId}-action-remove` : undefined)}
            >
              <Minus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {state === "empty" ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
