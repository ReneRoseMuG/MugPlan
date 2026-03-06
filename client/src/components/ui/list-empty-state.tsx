import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpText {
  helpKey: string;
  title: string;
  body: string | null;
}

export interface ListEmptyStateProps {
  helpKey?: string;
  fallbackTitle?: string;
  fallbackBody?: ReactNode;
  className?: string;
}

export function ListEmptyState({
  helpKey,
  fallbackTitle = "Keine Eintraege vorhanden.",
  fallbackBody,
  className,
}: ListEmptyStateProps) {
  const { data: helpText } = useQuery<HelpText | null>({
    queryKey: ["/api/help-texts", helpKey],
    enabled: Boolean(helpKey),
    staleTime: 5 * 60 * 1000,
  });

  const hasRenderableHelpText = Boolean(helpText && typeof helpText.body === "string" && helpText.body.trim().length > 0);

  return (
    <div
      className={cn(
        "col-span-full mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      {hasRenderableHelpText ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">
            {helpText?.title?.trim() || fallbackTitle}
          </h3>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: helpText?.body ?? "" }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">{fallbackTitle}</h3>
          {fallbackBody ? <div className="text-sm text-muted-foreground">{fallbackBody}</div> : null}
          {helpKey ? (
            <p className="text-xs text-muted-foreground" data-testid={`text-empty-helpkey-${helpKey}`}>
              helpKey: <span className="font-mono">{helpKey}</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
