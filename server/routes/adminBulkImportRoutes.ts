import { Router } from "express";
import { api } from "@shared/routes";
import * as adminBulkImportController from "../controllers/adminBulkImportController";
import * as adminSaunaTourImportController from "../controllers/adminSaunaTourImportController";

const router = Router();

router.post(api.admin.customerBulkImportAnalyze.path, adminBulkImportController.analyzeCustomersBulkImport);
router.post(api.admin.customerBulkImportApplyNew.path, adminBulkImportController.applyCustomersBulkImportNew);
router.post(api.admin.customerBulkImportApplyDuplicates.path, adminBulkImportController.applyCustomersBulkImportDuplicates);

router.post(api.admin.projectBulkImportAnalyze.path, adminBulkImportController.analyzeProjectsBulkImport);
router.post(api.admin.projectBulkImportApplyNew.path, adminBulkImportController.applyProjectsBulkImportNew);
router.post(api.admin.projectBulkImportApplySpecialCase.path, adminBulkImportController.applyProjectsBulkImportSpecialCase);

router.post(api.admin.saunaTourImportPreview.path, adminSaunaTourImportController.createSaunaTourPreview);
router.post(api.admin.saunaTourImportPreviewWeekRows.path, adminSaunaTourImportController.getSaunaTourPreviewWeekRows);
router.post(api.admin.saunaTourImportPreviewCleanup.path, adminSaunaTourImportController.cleanupSaunaTourPreview);

export default router;
