import { Router } from "express";

import { api } from "@shared/routes";
import * as reportsController from "../controllers/reportsController";

const router = Router();

router.get(api.reports.vorlaufliste.list.path, reportsController.listVorlaufliste);

export default router;
