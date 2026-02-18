import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type PlusActionButtonProps = Omit<ComponentProps<typeof Button>, "children">;

export function PlusActionButton({
  onClick,
  disabled,
  className,
  ...props
}: PlusActionButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("h-7 w-7", className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <Plus className="w-3 h-3" />
    </Button>
  );
}
