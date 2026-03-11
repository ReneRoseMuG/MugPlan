import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SeedPanelProps = {
  title: string;
  onRun?: () => Promise<void> | void;
  isRunning: boolean;
  logLines: string[];
  disabled?: boolean;
  description?: string;
  testId: string;
};

export function SeedPanel({
  title,
  onRun,
  isRunning,
  logLines,
  disabled = false,
  description,
  testId,
}: SeedPanelProps) {
  const isActionDisabled = disabled || !onRun || isRunning;

  return (
    <section className="sub-panel flex min-h-[280px] flex-col gap-4" data-testid={testId}>
      <div className="space-y-1">
        <h3 className="text-sm font-bold tracking-wider text-primary">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div>
        <Button
          type="button"
          onClick={() => void onRun?.()}
          disabled={isActionDisabled}
          data-testid={`button-run-${testId}`}
        >
          {isRunning ? "Daten werden erzeugt..." : "Daten erzeugen"}
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
