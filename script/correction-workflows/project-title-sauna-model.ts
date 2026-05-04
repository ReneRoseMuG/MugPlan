import { isReportSaunaProductCategoryName } from "../../shared/projectArticleList";
import type { CorrectionWorkflowDefinition, JsonValue, WorkflowCandidate, WorkflowExecutionContext } from "./types";

type ProjectSaunaRow = {
  projectId: number;
  currentName: string;
  projectVersion: number;
  updatedAt: unknown;
  orderNumber: string | null;
  orderItemId: number;
  productId: number;
  productName: string;
  categoryName: string;
};

type ProjectCandidateGroup = {
  projectId: number;
  currentName: string;
  projectVersion: number;
  updatedAt: JsonValue;
  orderNumber: string | null;
  rows: ProjectSaunaRow[];
};

const WORKFLOW_ID = "project-title-from-sauna-model";

function normalizeDatabaseValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return Number.isSafeInteger(Number(value)) ? Number(value) : String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toProjectSaunaRows(rows: unknown): ProjectSaunaRow[] {
  return (rows as Array<Record<string, unknown>>).map((row) => ({
    projectId: Number(row.projectId),
    currentName: String(row.currentName ?? ""),
    projectVersion: Number(row.projectVersion),
    updatedAt: row.updatedAt,
    orderNumber: typeof row.orderNumber === "string" ? row.orderNumber : null,
    orderItemId: Number(row.orderItemId),
    productId: Number(row.productId),
    productName: String(row.productName ?? ""),
    categoryName: String(row.categoryName ?? ""),
  }));
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildProjectGroups(rows: ProjectSaunaRow[]): ProjectCandidateGroup[] {
  const groups = new Map<number, ProjectCandidateGroup>();
  for (const row of rows) {
    if (!isReportSaunaProductCategoryName(row.categoryName)) {
      continue;
    }
    const existing = groups.get(row.projectId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(row.projectId, {
      projectId: row.projectId,
      currentName: row.currentName,
      projectVersion: row.projectVersion,
      updatedAt: normalizeDatabaseValue(row.updatedAt),
      orderNumber: row.orderNumber,
      rows: [row],
    });
  }
  return Array.from(groups.values()).sort((left, right) => left.projectId - right.projectId);
}

function buildCandidate(group: ProjectCandidateGroup): WorkflowCandidate {
  const normalizedModels = Array.from(new Set(
    group.rows
      .map((row) => normalizeName(row.productName))
      .filter((value) => value.length > 0),
  )).sort((left, right) => left.localeCompare(right, "de-DE"));
  const orderLabel = group.orderNumber ? `${group.orderNumber} | ` : "";

  if (normalizedModels.length === 0) {
    return {
      candidateId: `project-${group.projectId}`,
      status: "blocked",
      label: `${orderLabel}Projekt ${group.projectId}`,
      message: "Kein verwertbares Sauna-Modell gefunden.",
      metadata: {
        projectId: group.projectId,
        orderNumber: group.orderNumber,
        currentName: group.currentName,
      },
    };
  }

  if (normalizedModels.length > 1) {
    return {
      candidateId: `project-${group.projectId}`,
      status: "ambiguous",
      label: `${orderLabel}Projekt ${group.projectId} | mehrdeutig`,
      message: `Mehrere Sauna-Modelle gefunden: ${normalizedModels.join(", ")}`,
      metadata: {
        projectId: group.projectId,
        orderNumber: group.orderNumber,
        currentName: group.currentName,
        saunaModels: normalizedModels,
      },
    };
  }

  const targetName = normalizedModels[0]!;
  const currentName = normalizeName(group.currentName);
  const metadata = {
    projectId: group.projectId,
    orderNumber: group.orderNumber,
    currentName: group.currentName,
    targetName,
    saunaModel: targetName,
    orderItemIds: group.rows.map((row) => row.orderItemId),
    productIds: Array.from(new Set(group.rows.map((row) => row.productId))).sort((left, right) => left - right),
  };

  if (currentName === targetName) {
    return {
      candidateId: `project-${group.projectId}`,
      status: "already_ok",
      label: `${orderLabel}Projekt ${group.projectId} | ${group.currentName}`,
      message: "Projektname entspricht bereits dem Sauna-Modell.",
      metadata,
    };
  }

  return {
    candidateId: `project-${group.projectId}`,
    status: "actionable",
    label: `${orderLabel}Projekt ${group.projectId} | ${group.currentName} -> ${targetName}`,
    snapshotRows: [
      {
        table: "project",
        key: { id: group.projectId },
        data: {
          name: group.currentName,
          version: group.projectVersion,
          updated_at: group.updatedAt,
        },
      },
    ],
    mutationPlans: [
      {
        table: "project",
        key: { id: group.projectId },
        set: { name: targetName },
        allowedChangedFields: ["name", "updated_at"],
      },
    ],
    metadata,
  };
}

async function loadProjectSaunaRows(ctx: WorkflowExecutionContext): Promise<ProjectSaunaRow[]> {
  const [rows] = await ctx.connection.query(`
    select
      p.id as projectId,
      p.name as currentName,
      p.version as projectVersion,
      p.updated_at as updatedAt,
      po.order_number as orderNumber,
      poi.id as orderItemId,
      pr.id as productId,
      pr.name as productName,
      pc.name as categoryName
    from project p
    inner join project_order_items poi on poi.project_id = p.id
    inner join products pr on pr.id = poi.product_id
    inner join product_categories pc on pc.id = pr.category_id
    left join project_order po on po.project_id = p.id
    order by p.id, poi.id
  `);
  return toProjectSaunaRows(rows);
}

export const projectTitleFromSaunaModelWorkflow: CorrectionWorkflowDefinition = {
  id: WORKFLOW_ID,
  title: "Projekt-Titel aus Sauna-Modell",
  allowedRuntimeModes: ["development", "test", "production"],
  async discoverCandidates(ctx) {
    const rows = await loadProjectSaunaRows(ctx);
    return buildProjectGroups(rows).map(buildCandidate);
  },
  renderCandidateMarkdown(candidate) {
    const marker = candidate.status === "actionable"
      ? "[ ]"
      : candidate.status === "already_ok"
        ? "[=]"
        : candidate.status === "ambiguous"
          ? "[?]"
          : "[!]";
    const detail = candidate.message?.trim() ? ` | ${candidate.message.trim()}` : "";
    return `- ${marker} ${candidate.label}${detail}`;
  },
};
