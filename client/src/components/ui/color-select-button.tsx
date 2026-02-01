import { useRef } from "react";

interface ColorSelectButtonProps {
  color: string;
  onChange: (color: string) => void;
  testId?: string;
  disabled?: boolean;
}

export function ColorSelectButton({ 
  color, 
  onChange, 
  testId = "button-color-select",
  disabled = false,
}: ColorSelectButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center border border-border bg-muted/50 rounded px-3 py-2 gap-3 ${
        disabled ? "cursor-not-allowed opacity-60" : "hover-elevate cursor-pointer"
      }`}
      disabled={disabled}
      data-testid={testId}
    >
      <div 
        className="w-8 h-8 rounded border border-border flex-shrink-0"
        style={{ backgroundColor: color }}
        data-testid={`${testId}-preview`}
      />
      <span className="font-medium text-foreground">Farbe wählen</span>
      <input
        ref={inputRef}
        type="color"
        value={color}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        data-testid={`${testId}-input`}
      />
    </button>
  );
}
