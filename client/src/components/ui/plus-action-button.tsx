import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type PlusActionButtonProps = Omit<ComponentProps<typeof Button>, "children">;

export const PlusActionButton = React.forwardRef<HTMLButtonElement, PlusActionButtonProps>(
  ({ onClick, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
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
  },
);

PlusActionButton.displayName = "PlusActionButton";
