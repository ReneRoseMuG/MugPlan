import { ChevronDown, ChevronUp } from "lucide-react";

type SpinFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  strictTextBounds?: boolean;
  hint?: string;
  inputTestId?: string;
  incrementTestId?: string;
  decrementTestId?: string;
};

export function SpinField({
  label,
  value,
  onChange,
  min,
  max,
  strictTextBounds = false,
  hint,
  inputTestId,
  incrementTestId,
  decrementTestId,
}: SpinFieldProps) {
  const setClampedValue = (nextValue: number) => {
    onChange(Math.min(max, Math.max(min, nextValue)));
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex w-24 items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={String(value)}
          onChange={(event) => {
            const parsedValue = Number.parseInt(event.target.value.replace(/\D/g, ""), 10);
            const isWithinBounds = parsedValue >= min && parsedValue <= max;
            if (!Number.isNaN(parsedValue) && (!strictTextBounds || isWithinBounds)) {
              setClampedValue(parsedValue);
            }
          }}
          className="w-full px-2.5 py-2 text-left text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          data-testid={inputTestId}
        />
        <div className="flex flex-col border-l border-slate-200">
          <button
            type="button"
            onClick={() => setClampedValue(value + 1)}
            className="flex flex-1 items-center justify-center border-b border-slate-200 px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            data-testid={incrementTestId}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setClampedValue(value - 1)}
            className="flex flex-1 items-center justify-center px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            data-testid={decrementTestId}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      {hint ? <span className="text-[11px] leading-tight text-slate-400">{hint}</span> : null}
    </div>
  );
}
