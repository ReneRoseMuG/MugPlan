import { Router } from "express";
import { api } from "@shared/routes";
import * as tourEmployeesController from "../controllers/tourEmployeesController";

const router = Router();

router.get(api.tourEmployees.list.path, tourEmployeesController.listTourEmployees);
router.delete(api.tourEmployees.remove.path, tourEmployeesController.removeTourEmployee);
router.post(api.tourEmployees.assign.path, tourEmployeesController.assignTourEmployees);
router.post(api.tourEmployees.addPreview.path, tourEmployeesController.previewAddTourEmployeeCascade);
router.post(api.tourEmployees.addExecute.path, tourEmployeesController.executeAddTourEmployeeCascade);
router.post(api.tourEmployees.removePreview.path, tourEmployeesController.previewRemoveTourEmployeeCascade);
router.post(api.tourEmployees.removeExecute.path, tourEmployeesController.executeRemoveTourEmployeeCascade);

export default router;
