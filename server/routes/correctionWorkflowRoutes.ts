import { Router } from "express";
import { api } from "@shared/routes";
import * as correctionWorkflowController from "../controllers/correctionWorkflowController";

const router = Router();

router.post(
  api.admin.saunaProjectTitleMigrationPreview.path,
  correctionWorkflowController.previewSaunaProjectTitleMigration,
);
router.post(
  api.admin.saunaProjectTitleMigrationApply.path,
  correctionWorkflowController.applySaunaProjectTitleMigration,
);

export default router;
