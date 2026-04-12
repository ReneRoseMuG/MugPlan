import {
  isManagedComplaintTagName,
  isManagedMesseTagName,
} from "@shared/appointmentCancellation";

export type ExistingNote = {
  title: string;
};

export type TagAddedAction =
  | { kind: "show_note_suggestion_dialog"; templateTitle: string }
  | { kind: "noop" };

export type TagRemovedAction =
  | { kind: "show_note_removal_dialog"; templateTitle: string }
  | { kind: "noop" };

function normalizeTitle(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

function hasDuplicateNote(existingNotes: ExistingNote[], templateTitle: string): boolean {
  const normalizedTemplate = normalizeTitle(templateTitle);
  return existingNotes.some((note) => normalizeTitle(note.title) === normalizedTemplate);
}

function resolveTemplateTitle(tagName: string): string | null {
  if (isManagedComplaintTagName(tagName)) return "Reklamation";
  if (isManagedMesseTagName(tagName)) return "Messe Aufbau/Abbau";
  return null;
}

export function computeTagAddedAction(
  tagName: string,
  appointmentId: number | null | undefined,
  existingNotes: ExistingNote[],
): TagAddedAction {
  if (!appointmentId) return { kind: "noop" };

  const templateTitle = resolveTemplateTitle(tagName);
  if (!templateTitle) return { kind: "noop" };

  if (hasDuplicateNote(existingNotes, templateTitle)) {
    return { kind: "noop" };
  }

  return { kind: "show_note_suggestion_dialog", templateTitle };
}

export function computeTagRemovedAction(
  tagName: string,
  existingNotes: ExistingNote[],
): TagRemovedAction {
  const templateTitle = resolveTemplateTitle(tagName);
  if (!templateTitle) return { kind: "noop" };

  if (!hasDuplicateNote(existingNotes, templateTitle)) {
    return { kind: "noop" };
  }

  return { kind: "show_note_removal_dialog", templateTitle };
}

export type TagRuleEngineDialog =
  | { kind: "note_suggestion"; templateTitle: string }
  | { kind: "note_removal"; templateTitle: string }
  | null;

export type UseTagRuleEngineResult = {
  dialog: TagRuleEngineDialog;
  onTagAdded: (tagName: string, appointmentId: number | null | undefined, existingNotes: ExistingNote[]) => TagAddedAction;
  onTagRemoved: (tagName: string, existingNotes: ExistingNote[]) => TagRemovedAction;
};

export function useTagRuleEngine(): UseTagRuleEngineResult {
  return {
    dialog: null,
    onTagAdded: computeTagAddedAction,
    onTagRemoved: computeTagRemovedAction,
  };
}
