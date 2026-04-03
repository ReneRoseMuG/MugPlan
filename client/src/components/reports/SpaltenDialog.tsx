import { ArrowDown, ArrowUp, GripVertical, RotateCcw, X } from "lucide-react";

type SpaltenDialogColumn = {
  id: string;
  label: string;
};

type SpaltenDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  columns: SpaltenDialogColumn[];
  hiddenColumnIds: string[];
  onClose: () => void;
  onReset: () => void;
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onMoveColumn: (columnId: string, direction: -1 | 1) => void;
  testId?: string;
};

export function SpaltenDialog({
  open,
  title = "Spalten konfigurieren",
  description = "Sichtbarkeit und Reihenfolge",
  columns,
  hiddenColumnIds,
  onClose,
  onReset,
  onToggleColumn,
  onMoveColumn,
  testId,
}: SpaltenDialogProps) {
  if (!open) {
    return null;
  }

  const visibleCount = columns.filter((column) => !hiddenColumnIds.includes(column.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" data-testid={testId}>
      <div className="mx-4 flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            data-testid="button-reports-vorlaufliste-columns-dialog-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              data-testid="button-reports-vorlaufliste-columns-dialog-reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <span className="text-xs text-slate-400">
              {visibleCount} von {columns.length} sichtbar
            </span>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
            {columns.map((column, index) => {
              const isVisible = !hiddenColumnIds.includes(column.id);
              return (
                <label
                  key={column.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 transition-colors group-hover:text-slate-400" />
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onToggleColumn(column.id, !isVisible)}
                    className="h-4 w-4 shrink-0 rounded accent-slate-700"
                    data-testid={`checkbox-reports-vorlaufliste-column-${column.id}`}
                  />
                  <span className={isVisible ? "flex-1 text-sm text-slate-800" : "flex-1 text-sm text-slate-400"}>
                    {column.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        onMoveColumn(column.id, -1);
                      }}
                      disabled={index <= 0}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      data-testid={`button-reports-vorlaufliste-column-${column.id}-up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        onMoveColumn(column.id, 1);
                      }}
                      disabled={index >= columns.length - 1}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      data-testid={`button-reports-vorlaufliste-column-${column.id}-down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
            data-testid="button-reports-vorlaufliste-columns-dialog-apply"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
