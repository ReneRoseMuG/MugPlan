export interface ParsedProjectName {
  customerNumberFromName: string | null;
  isolatedProjectName: string;
}

const PROJECT_NAME_PATTERN = /^K:\s*(.+?)\s*-\s*(.*)$/;

export const formatProjectStoredName = (customerNumber: string, isolatedProjectName: string) => {
  const customerNumberTrimmed = customerNumber.trim();
  const isolatedProjectNameTrimmed = isolatedProjectName.trim();
  if (!customerNumberTrimmed || !isolatedProjectNameTrimmed) {
    return isolatedProjectNameTrimmed;
  }
  return `K: ${customerNumberTrimmed} - ${isolatedProjectNameTrimmed}`;
};

export const parseProjectStoredName = (storedProjectName: string | null | undefined): ParsedProjectName => {
  const normalized = (storedProjectName ?? "").trim();
  if (!normalized) {
    return {
      customerNumberFromName: null,
      isolatedProjectName: "",
    };
  }

  const match = normalized.match(PROJECT_NAME_PATTERN);
  if (!match) {
    return {
      customerNumberFromName: null,
      isolatedProjectName: normalized,
    };
  }

  return {
    customerNumberFromName: match[1]?.trim() || null,
    isolatedProjectName: (match[2] ?? "").trim(),
  };
};
