import { ReactNode } from "react";
import { Filter } from "lucide-react";
import { CardListLayout } from "@/components/ui/card-list-layout";

interface FilteredCardListLayoutProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  filters?: ReactNode;
  isLoading?: boolean;
  onClose?: () => void;
  closeTestId?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    isPending?: boolean;
    testId?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  gridTestId?: string;
  gridCols?: "2" | "3";
  emptyState?: ReactNode;
  isEmpty?: boolean;
  toolbar?: ReactNode;
  helpKey?: string;
}

export function FilteredCardListLayout({
  filters,
  ...props
}: FilteredCardListLayoutProps) {
  const bottomBar = filters ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="w-4 h-4 text-primary" />
        <span>Filter</span>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {filters}
      </div>
    </div>
  ) : undefined;

  return (
    <CardListLayout {...props} bottomBar={bottomBar} />
  );
}
