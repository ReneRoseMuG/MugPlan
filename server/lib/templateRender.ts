const placeholderPattern = /\{([a-zA-Z0-9_]+)\}/g;

type RenderOptions = {
  allowedKeys?: ReadonlySet<string>;
};

function isMeaningfulValue(value: string | undefined) {
  return value !== undefined && value.trim().length > 0;
}

function shouldDropLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  // Drop lines like "- Label:" or "- Label: " after replacement.
  return /^-\s*[^:]+:\s*$/.test(trimmed);
}

export function renderTemplate(
  template: string,
  context: Record<string, string | undefined>,
  options?: RenderOptions,
) {
  const replaced = template.replace(placeholderPattern, (full, key: string) => {
    if (options?.allowedKeys && !options.allowedKeys.has(key)) {
      return full;
    }
    const value = context[key];
    return isMeaningfulValue(value) ? String(value).trim() : "";
  });

  return replaced
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .filter((line) => !shouldDropLine(line))
    .join("\n")
    .trim();
}

export function extractTemplatePlaceholders(template: string) {
  const keys = new Set<string>();
  for (const match of Array.from(template.matchAll(placeholderPattern))) {
    if (match[1]) keys.add(match[1]);
  }
  return Array.from(keys);
}
