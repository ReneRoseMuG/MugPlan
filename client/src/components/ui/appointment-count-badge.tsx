import { Calendar } from "lucide-react";

interface AppointmentCountBadgeProps {
  count: number;
  testId?: string;
  fullWidth?: boolean;
}

export function AppointmentCountBadge({ count, testId, fullWidth = false }: AppointmentCountBadgeProps) {
  return (
    <div
      className={`mt-1 rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 ${fullWidth ? "w-full" : ""}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Geplante Termine
        </span>
        <span>{count}</span>
      </div>
    </div>
  );
}
