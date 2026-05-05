import { Router } from "express";

import { api } from "@shared/routes";
import * as reportConfigsController from "../controllers/reportConfigsController";

const router = Router();

router.get(api.reportConfigs.list.path, reportConfigsController.listReportPresets);
router.put(api.reportConfigs.set.path, reportConfigsController.upsertReportPreset);
router.delete(api.reportConfigs.delete.path, reportConfigsController.deleteReportPreset);

export default router;
