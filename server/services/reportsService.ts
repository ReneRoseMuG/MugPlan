import type { CanonicalRoleKey } from "../settings/registry";
import * as reportsRepository from "../repositories/reportsRepository";

export class ReportsError extends Error {
  status: number;
  code: "FORBIDDEN" | "VALIDATION_ERROR";

  constructor(status: number, code: "FORBIDDEN" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function assertReportReadRole(roleKey: CanonicalRoleKey) {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new ReportsError(403, "FORBIDDEN");
  }
}

export async function listVorlaufliste(
  params: {
    fromDate: string;
    toDate?: string;
    productCategoryIds: number[];
    componentCategoryIds: number[];
    page: number;
    pageSize: number;
  },
  roleKey: CanonicalRoleKey,
) {
  assertReportReadRole(roleKey);

  if (params.toDate && params.toDate < params.fromDate) {
    throw new ReportsError(422, "VALIDATION_ERROR");
  }

  return reportsRepository.getVorlauflistePaged(params);
}
