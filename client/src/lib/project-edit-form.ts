export const DEFAULT_PROJECT_TYPE = 1;
export const DEFAULT_PROJECT_EDIT_FORM_KEY = "sauna";

export type ProjectEditFormKey = typeof DEFAULT_PROJECT_EDIT_FORM_KEY;

export function normalizeProjectType(projectType: number | null | undefined): number {
  return projectType === DEFAULT_PROJECT_TYPE ? DEFAULT_PROJECT_TYPE : DEFAULT_PROJECT_TYPE;
}

export function resolveProjectEditForm(projectType: number | null | undefined): {
  normalizedType: number;
  formKey: ProjectEditFormKey;
  label: string;
} {
  return {
    normalizedType: normalizeProjectType(projectType),
    formKey: DEFAULT_PROJECT_EDIT_FORM_KEY,
    label: "Typ 1 - Sauna",
  };
}
