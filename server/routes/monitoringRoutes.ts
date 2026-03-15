import { Router } from "express";
import { api } from "@shared/routes";
import * as monitoringController from "../controllers/monitoringController";

const router = Router();

router.get(api.monitoring.list.path, monitoringController.listMonitoring);
router.get(api.monitoring.adminConfigGet.path, monitoringController.getMonitoringConfig);
router.put(api.monitoring.adminConfigSet.path, monitoringController.setMonitoringConfig);

export default router;

