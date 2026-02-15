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
    <section className="rounded-lg border border-border overflow-hidden" data-testid={testId}>
      <header className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary truncate">{title}</h3>
        </div>
        <div className="flex items-center shrink-0 min-h-8">
          {canAdd && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAdd}
              data-testid={addActionTestId ?? (testId ? `${testId}-action-add` : undefined)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {addLabel}
            </Button>
          )}
          {canRemove && (
            <Button
              size="icon"
              variant="outline"
              onClick={onRemove}
              data-testid={removeActionTestId ?? (testId ? `${testId}-action-remove` : undefined)}
            >
              <Minus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="p-4">
        {state === "empty" ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
