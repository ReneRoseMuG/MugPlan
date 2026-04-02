import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

export type VorlauflisteCategory = {
  id: number;
  name: string;
};

export type VorlauflistePreviewItem = {
  projectId: number;
  projectName: string;
  isActive: boolean;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string | null;
  tags: Tag[];
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  articleValues: Array<{ categoryId: number; value: string | null }>;
  projectDescription: string | null;
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
};

export type VorlauflistePreviewProject = {
  id: number;
  name: string;
  isActive: boolean;
  orderNumber: string | null;
  descriptionMd: string | null;
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
  tags: Tag[];
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
  projectArticleItems: ProjectArticleItem[];
};

export const VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME = [
  "block",
  "overflow-hidden",
  "whitespace-normal",
  "break-words",
  "[overflow-wrap:anywhere]",
  "[display:-webkit-box]",
  "[-webkit-box-orient:vertical]",
  "[-webkit-line-clamp:3]",
].join(" ");

export function buildVorlauflistePreviewArticleItems(
  row: Pick<VorlauflistePreviewItem, "articleValues">,
  productCategories: VorlauflisteCategory[],
  componentCategories: VorlauflisteCategory[],
): ProjectArticleItem[] {
  const categoryNameById = new Map<number, string>();
  for (const category of productCategories) {
    categoryNameById.set(category.id, category.name);
  }
  for (const category of componentCategories) {
    categoryNameById.set(category.id, category.name);
  }

  return row.articleValues
    .map((entry) => ({
      label: categoryNameById.get(entry.categoryId)?.trim() ?? "",
      value: entry.value?.trim() ?? "",
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
}

export function buildVorlauflistePreviewProject(
  row: VorlauflistePreviewItem,
  productCategories: VorlauflisteCategory[],
  componentCategories: VorlauflisteCategory[],
): VorlauflistePreviewProject {
  return {
    id: row.projectId,
    name: row.projectName,
    isActive: row.isActive,
    orderNumber: row.orderNumber?.trim() || null,
    descriptionMd: row.projectDescription,
    notesCount: row.notesCount,
    plannedAppointmentsCount: row.plannedAppointmentsCount,
    attachmentsCount: row.attachmentsCount,
    tags: [...row.tags],
    customer: {
      id: row.customerId,
      customerNumber: row.customerNumber?.trim() || "-",
      fullName: row.customerFullName,
      postalCode: row.postalCode,
      city: row.city,
      country: row.country,
    },
    projectArticleItems: buildVorlauflistePreviewArticleItems(
      row,
      productCategories,
      componentCategories,
    ),
  };
}
