import { useMemo } from "react";
import { Boxes, FileText, ListChecks, Package, Tags } from "lucide-react";
import { EntityFormWithTabsLayout } from "@/components/ui/entity-form-with-tabs-layout";
import { ProductManagementPage } from "@/components/ProductManagementPage";
import { MasterDataPdfMiningPage } from "@/components/MasterDataPdfMiningPage";
import { TagManagementPage } from "@/components/TagManagementPage";
import { ProjectStatusPage } from "@/components/ProjectStatusPage";
import { NoteTemplatesPage } from "@/components/NoteTemplatesPage";

export type MasterDataTabId = "products" | "pdf-mining" | "tags" | "project-status" | "note-templates";

interface MasterDataPageProps {
  initialTabId?: MasterDataTabId;
}

export function MasterDataPage({ initialTabId = "products" }: MasterDataPageProps) {
  const tabs = useMemo(
    () => [
      {
        id: "products",
        label: "Produkte",
        icon: <Package className="h-4 w-4" />,
        content: <ProductManagementPage />,
      },
      {
        id: "pdf-mining",
        label: "PDF Mining",
        icon: <Package className="h-4 w-4" />,
        content: <MasterDataPdfMiningPage />,
      },
      {
        id: "tags",
        label: "Tags",
        icon: <Tags className="h-4 w-4" />,
        content: <TagManagementPage />,
      },
      {
        id: "project-status",
        label: "Projekt Status",
        icon: <ListChecks className="h-4 w-4" />,
        content: <ProjectStatusPage />,
      },
      {
        id: "note-templates",
        label: "Notiz Vorlagen",
        icon: <FileText className="h-4 w-4" />,
        content: <NoteTemplatesPage />,
      },
    ],
    [],
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
