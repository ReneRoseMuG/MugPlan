import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SeedPanelProps = {
  title: string;
  onRun?: () => Promise<void> | void;
  onExport?: () => Promise<void> | void;
  isRunning: boolean;
  isExporting: boolean;
  logLines: string[];
  sourceFile: string;
  sourceExists: boolean;
  disabled?: boolean;
  description?: string;
  testId: string;
};

export function SeedPanel({
  title,
  onRun,
  onExport,
  isRunning,
  isExporting,
  logLines,
  sourceFile,
  sourceExists,
  disabled = false,
  description,
  testId,
}: SeedPanelProps) {
  const isActionDisabled = disabled || !onRun || isRunning || isExporting;
  const isExportDisabled = disabled || !onExport || isRunning || isExporting;

  return (
    <section className="sub-panel flex min-h-[280px] flex-col gap-4" data-testid={testId}>
      <div className="space-y-1">
        <h3 className="text-sm font-bold tracking-wider text-primary">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        <div className="text-xs text-muted-foreground" data-testid={`status-${testId}`}>
          Quelldatei `{sourceFile}`: {sourceExists ? "vorhanden" : "fehlt"}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => void onRun?.()}
          disabled={isActionDisabled}
          data-testid={`button-run-${testId}`}
        >
          {isRunning ? "Import laeuft..." : "Import"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onExport?.()}
          disabled={isExportDisabled}
          data-testid={`button-export-${testId}`}
        >
          {isExporting ? "Export laeuft..." : "Export"}
        </Button>
      </div>
      <Textarea
        readOnly
        value={logLines.join("\n")}
        className="min-h-[160px] flex-1 resize-none bg-white"
        data-testid={`textarea-${testId}`}
      />
    </section>
  );
}
