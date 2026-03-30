import { Router } from "express";
import { api } from "@shared/routes";
import * as tourEmployeesController from "../controllers/tourEmployeesController";

const router = Router();

router.get(api.tourEmployees.active.path, tourEmployeesController.listActiveTourEmployees);
router.post(api.tourEmployees.addPreview.path, tourEmployeesController.previewAddTourEmployeeCascade);
router.post(api.tourEmployees.addExecute.path, tourEmployeesController.executeAddTourEmployeeCascade);
router.post(api.tourEmployees.removePreview.path, tourEmployeesController.previewRemoveTourEmployeeCascade);
router.post(api.tourEmployees.removeExecute.path, tourEmployeesController.executeRemoveTourEmployeeCascade);

export default router;
