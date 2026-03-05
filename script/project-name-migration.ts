export type ProjectRow = {
  projectId: number;
  currentName: string;
  customerNumber: string;
};

export type Decision =
  | { kind: "update"; projectId: number; from: string; to: string }
  | { kind: "skip"; projectId: number; reason: string; currentName: string };

const PREFIX_PATTERN = /^K:\s*(.+?)\s*-\s*(.*)$/;

export function decideProjectNameMigration(row: ProjectRow): Decision {
  const normalizedName = row.currentName.trim();
  const customerNumber = row.customerNumber.trim();
  const match = normalizedName.match(PREFIX_PATTERN);
  if (!match) {
    return {
      kind: "skip",
      projectId: row.projectId,
      reason: "name_has_no_prefix_pattern",
      currentName: row.currentName,
    };
  }

  const embeddedCustomerNumber = (match[1] ?? "").trim();
  const isolatedProjectName = (match[2] ?? "").trim();
  if (embeddedCustomerNumber !== customerNumber) {
    return {
      kind: "skip",
      projectId: row.projectId,
      reason: "prefix_customer_number_mismatch",
      currentName: row.currentName,
    };
  }

  if (!isolatedProjectName) {
    return {
      kind: "skip",
      projectId: row.projectId,
      reason: "isolated_project_name_empty",
      currentName: row.currentName,
    };
  }

  return {
    kind: "update",
    projectId: row.projectId,
    from: row.currentName,
    to: isolatedProjectName,
  };
}
