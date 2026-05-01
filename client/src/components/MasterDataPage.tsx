import { useMemo } from "react";
import { Boxes, CalendarDays, FileText, HelpCircle, Package, Tags } from "lucide-react";
import { EntityFormWithTabsLayout } from "@/components/ui/entity-form-with-tabs-layout";
import { ProductManagementPage } from "@/components/ProductManagementPage";
import { TagManagementPage } from "@/components/TagManagementPage";
import { NoteTemplatesPage } from "@/components/NoteTemplatesPage";
import { HelpTextsPage } from "@/components/HelpTextsPage";
import { CalendarMarkersAdminPage } from "@/components/CalendarMarkersAdminPage";
import { getStoredUserRole } from "@/lib/auth";

export type MasterDataTabId = "products" | "tags" | "help-texts" | "note-templates" | "calendar-markers";

interface MasterDataPageProps {
  initialTabId?: MasterDataTabId;
  onCreateHelpText?: () => void;
  onEditHelpText?: (id: number) => void;
}

export function MasterDataPage({
  initialTabId = "products",
  onCreateHelpText = () => undefined,
  onEditHelpText = () => undefined,
}: MasterDataPageProps) {
  const isAdmin = getStoredUserRole() === "ADMIN";
  const tabs = useMemo(
    () => [
      {
        id: "products",
        label: "Produkte",
        icon: <Package className="h-4 w-4" />,
        content: <ProductManagementPage />,
      },
      {
        id: "tags",
        label: "Tags",
        icon: <Tags className="h-4 w-4" />,
        content: <TagManagementPage />,
      },
      {
        id: "help-texts",
        label: "Hilfetexte",
        icon: <HelpCircle className="h-4 w-4" />,
        content: <HelpTextsPage onCreateHelpText={onCreateHelpText} onEditHelpText={onEditHelpText} />,
      },
      {
        id: "note-templates",
        label: "Notiz Vorlagen",
        icon: <FileText className="h-4 w-4" />,
        content: <NoteTemplatesPage />,
      },
      ...(isAdmin ? [{
        id: "calendar-markers",
        label: "Feiertage",
        icon: <CalendarDays className="h-4 w-4" />,
        content: <CalendarMarkersAdminPage />,
      }] : []),
    ],
    [isAdmin, onCreateHelpText, onEditHelpText],
  );

  return (
    <EntityFormWithTabsLayout
      title="Stammdaten"
      icon={<Boxes className="w-5 h-5" />}
      tabs={tabs}
      defaultTabId={initialTabId}
      testIdPrefix="master-data"
      keepMounted={false}
    />
  );
}
