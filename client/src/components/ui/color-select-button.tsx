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

  const applyColor = (nextColor: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(nextColor)) return;
    onChange(nextColor.toLowerCase());
  };

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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="font-medium text-foreground">Farbe waehlen</span>
        <input
          type="text"
          value={color}
          disabled={disabled}
          onChange={(event) => applyColor(event.target.value)}
          className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          data-testid={`${testId}-hex`}
        />
      </div>
      <input
        ref={inputRef}
        type="color"
        value={color}
        disabled={disabled}
        onInput={(event) => applyColor((event.target as HTMLInputElement).value)}
        onChange={(event) => applyColor(event.target.value)}
        className="sr-only"
        data-testid={`${testId}-input`}
      />
    </button>
  );
}
