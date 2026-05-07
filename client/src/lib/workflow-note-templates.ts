import type { NoteTemplate } from "@shared/schema";

export type WorkflowNoteDraft = {
  title: string;
  body: string;
  cardColor?: string | null;
  print: boolean;
  templateId?: number;
};

export function normalizeWorkflowNoteTitle(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

export function findWorkflowNoteTemplate(
  templates: NoteTemplate[],
  templateTitle: string,
): NoteTemplate | undefined {
  const normalizedTemplateTitle = normalizeWorkflowNoteTitle(templateTitle);
  return templates.find((entry) => normalizeWorkflowNoteTitle(entry.title) === normalizedTemplateTitle);
}

export function buildWorkflowNoteDraft(template: NoteTemplate): WorkflowNoteDraft {
  return {
    title: template.title,
    body: template.body,
    cardColor: template.cardColor,
    print: true,
    templateId: template.id,
  };
}
