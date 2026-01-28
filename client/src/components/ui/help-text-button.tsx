import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpText {
  helpKey: string;
  title: string;
  body: string;
}

interface HelpTextButtonProps {
  helpKey: string;
  className?: string;
}

export function HelpTextButton({ helpKey, className }: HelpTextButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: helpText, isLoading } = useQuery<HelpText | null>({
    queryKey: ["/api/help-texts/key", helpKey],
    queryFn: async () => {
      const response = await fetch(`/api/help-texts/${helpKey}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Fehler beim Laden");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !helpText) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setDialogOpen(true)}
        className={className}
        data-testid={`button-help-${helpKey}`}
        title="Hilfe anzeigen"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              {helpText.title}
            </DialogTitle>
          </DialogHeader>
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: helpText.body }}
            data-testid={`text-help-body-${helpKey}`}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
