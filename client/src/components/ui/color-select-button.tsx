import { useRef } from "react";

interface ColorSelectButtonProps {
  color: string;
  onChange: (color: string) => void;
  testId?: string;
  disabled?: boolean;
  label?: string;
}

export function ColorSelectButton({
  color,
  onChange,
  testId = "button-color-select",
  disabled = false,
  label = "Farbe",
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
    <div
      className={`w-full flex items-center border border-border bg-muted/50 rounded px-3 py-2 gap-3 ${
        disabled ? "opacity-60" : ""
      }`}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`w-8 h-8 rounded border border-border flex-shrink-0 ${
          disabled ? "cursor-not-allowed" : "hover-elevate cursor-pointer"
        }`}
        style={{ backgroundColor: color }}
        disabled={disabled}
        data-testid={`${testId}-preview`}
        aria-label={label}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="font-medium text-foreground">{label}</span>
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
    </div>
  );
}
