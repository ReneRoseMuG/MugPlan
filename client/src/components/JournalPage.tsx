import { History } from "lucide-react";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { ListLayout } from "@/components/ui/list-layout";

export function JournalPage() {
  return (
    <ListLayout
      title="Journal"
      icon={<History className="h-5 w-5" />}
      contentClassName="min-h-0 p-6"
      contentSlot={<JournalRecordsView testIdPrefix="journal-page" />}
    />
  );
}
