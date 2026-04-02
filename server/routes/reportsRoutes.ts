import { Router } from "express";

import { api } from "@shared/routes";
import * as reportsController from "../controllers/reportsController";

const router = Router();

router.get(api.reports.vorlaufliste.list.path, reportsController.listVorlaufliste);
router.get(api.reports.vorlaufliste.printPreview.path, reportsController.getVorlauflistePrintPreview);
router.get(api.reports.productVorlauf.list.path, reportsController.listProductVorlauf);

export default router;
