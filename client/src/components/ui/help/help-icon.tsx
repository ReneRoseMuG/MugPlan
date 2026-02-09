import { useQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HelpText {
  helpKey: string;
  title: string;
  body: string;
}

interface HelpIconProps {
  helpKey: string;
  className?: string;
  align?: "start" | "center" | "end";
  size?: "sm" | "md";
}

const buttonSizeClass: Record<NonNullable<HelpIconProps["size"]>, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
};

const iconSizeClass: Record<NonNullable<HelpIconProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

export function HelpIcon({
  helpKey,
  className,
  align = "start",
  size = "md",
}: HelpIconProps) {
  const { data: helpText, isLoading, isError } = useQuery<HelpText | null>({
    queryKey: ["/api/help-texts", helpKey],
    enabled: !!helpKey,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(buttonSizeClass[size], className)}
          data-testid={`button-help-${helpKey}`}
          aria-label={`Hilfe für ${helpKey}`}
        >
          <CircleHelp className={iconSizeClass[size]} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-80 overflow-y-auto" align={align}>
        {isLoading ? (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Hilfe</h4>
            <p className="text-sm text-muted-foreground">Hilfetext wird geladen...</p>
          </div>
        ) : isError ? (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Hilfe</h4>
            <p className="text-sm text-destructive">Fehler beim Laden des Hilfetexts.</p>
          </div>
        ) : helpText ? (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{helpText.title}</h4>
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: helpText.body }}
              data-testid={`text-help-body-${helpKey}`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Hilfe</h4>
            <p className="text-sm text-muted-foreground">
              Kein Hilfetext für "{helpKey}" verfügbar.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
