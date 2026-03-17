import { useMemo } from "react";
import { Boxes, DatabaseZap, FileText, Package, Tags } from "lucide-react";
import { EntityFormWithTabsLayout } from "@/components/ui/entity-form-with-tabs-layout";
import { ProductManagementPage } from "@/components/ProductManagementPage";
import { TagManagementPage } from "@/components/TagManagementPage";
import { NoteTemplatesPage } from "@/components/NoteTemplatesPage";
import { MasterDataSeedPage } from "@/components/MasterDataSeedPage";

export type MasterDataTabId = "products" | "tags" | "note-templates" | "seed";

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
        id: "tags",
        label: "Tags",
        icon: <Tags className="h-4 w-4" />,
        content: <TagManagementPage />,
      },
      {
        id: "note-templates",
        label: "Notiz Vorlagen",
        icon: <FileText className="h-4 w-4" />,
        content: <NoteTemplatesPage />,
      },
      {
        id: "seed",
        label: "Seed",
        icon: <DatabaseZap className="h-4 w-4" />,
        content: <MasterDataSeedPage />,
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
