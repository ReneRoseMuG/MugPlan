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
    useShortCodes: boolean;
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

export async function getVorlauflistePrintPreview(
  params: {
    fromDate: string;
    toDate?: string;
    useShortCodes: boolean;
  },
  roleKey: CanonicalRoleKey,
) {
  assertReportReadRole(roleKey);

  if (params.toDate && params.toDate < params.fromDate) {
    throw new ReportsError(422, "VALIDATION_ERROR");
  }

  return reportsRepository.getVorlauflistePrintPreview(params);
}

export async function listProductVorlauf(
  params: {
    fromDate: string;
    toDate?: string;
    productCategoryIds: number[];
    componentCategoryIds: number[];
    useShortCodes: boolean;
    sonderblockTagIds: number[];
  },
  roleKey: CanonicalRoleKey,
) {
  assertReportReadRole(roleKey);

  if (params.toDate && params.toDate < params.fromDate) {
    throw new ReportsError(422, "VALIDATION_ERROR");
  }

  return reportsRepository.getProductVorlauf(params);
}
