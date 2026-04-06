import { ArrowRight, ExternalLink } from "lucide-react";

type ReportOpenToggleProps = {
  disabled?: boolean;
  onOpen: () => void;
  onOpenInTab: () => void;
  openTestId: string;
  openInTabTestId: string;
};

export function ReportOpenToggle({
  disabled = false,
  onOpen,
  onOpenInTab,
  openTestId,
  openInTabTestId,
}: ReportOpenToggleProps) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-amber-700/20 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="flex items-center gap-2 bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={openTestId}
      >
        Öffnen
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOpenInTab}
        disabled={disabled}
        className="flex items-center gap-2 border-l border-amber-700/20 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={openInTabTestId}
        title="Im Tab öffnen"
        aria-label="Im Tab öffnen"
      >
        <ExternalLink className="h-4 w-4" />
        Im Tab öffnen
      </button>
    </div>
  );
}
