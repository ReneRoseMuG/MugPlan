import { useQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSetting } from "@/hooks/useSettings";
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

function resolvePreviewSizeClass(previewSize: unknown): string {
  if (previewSize === "small") return "w-80 max-h-64 overflow-y-auto";
  if (previewSize === "large") return "w-[38rem] max-h-[32rem] overflow-y-auto";
  return "w-96 max-h-80 overflow-y-auto";
}

export function HelpIcon({
  helpKey,
  className,
  align = "start",
  size = "md",
}: HelpIconProps) {
  const helpTextPreviewSize = useSetting("helpTextPreviewSize");
  const popoverClassName = resolvePreviewSizeClass(helpTextPreviewSize);
  const { data: helpText, isLoading, isError } = useQuery<HelpText | null>({
    queryKey: ["/api/help-texts", helpKey],
    enabled: !!helpKey,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedHelpText = helpText && helpText.body.trim().length > 0 ? helpText : null;
  if (isLoading || isError || !resolvedHelpText) {
    return null;
  }

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
      <PopoverContent className={popoverClassName} align={align}>
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{resolvedHelpText.title}</h4>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: resolvedHelpText.body }}
            data-testid={`text-help-body-${helpKey}`}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

