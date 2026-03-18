import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface StaleDataBannerProps {
  onRefresh: () => void;
}

export function StaleDataBanner({ onRefresh }: StaleDataBannerProps) {
  const queryClient = useQueryClient();

  function handleRefresh() {
    void queryClient.invalidateQueries();
    onRefresh();
  }

  return (
    <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2">
      <span className="text-sm text-amber-800">
        Daten wurden von einem anderen Nutzer geändert.
      </span>
      <Button size="sm" variant="outline" onClick={handleRefresh}>
        Aktualisieren
      </Button>
    </div>
  );
}
