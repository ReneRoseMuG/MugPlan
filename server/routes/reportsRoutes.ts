import { Router } from "express";

import { api } from "@shared/routes";
import * as reportsController from "../controllers/reportsController";

const router = Router();

router.get(api.reports.defaults.get.path, reportsController.getReportConfigDefaults);
router.get(api.reports.vorlaufliste.list.path, reportsController.listVorlaufliste);
router.get(api.reports.vorlaufliste.printPreview.path, reportsController.getVorlauflistePrintPreview);
router.get(api.reports.produktionsplanung.list.path, reportsController.listProduktionsplanung);

export default router;
