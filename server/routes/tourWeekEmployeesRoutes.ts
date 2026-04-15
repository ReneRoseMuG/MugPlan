import { Router } from "express";
import { api } from "@shared/routes";
import * as tourWeekEmployeesController from "../controllers/tourWeekEmployeesController";

const router = Router();

router.get(api.tourWeekEmployees.list.path, tourWeekEmployeesController.listTourWeekEmployees);
router.get(api.tourWeekEmployees.available.path, tourWeekEmployeesController.listAvailableTourWeekEmployees);
router.post(api.tourWeekEmployees.addPreview.path, tourWeekEmployeesController.previewAddTourWeekEmployee);
router.post(api.tourWeekEmployees.addExecute.path, tourWeekEmployeesController.executeAddTourWeekEmployee);
router.post(api.tourWeekEmployees.removePreview.path, tourWeekEmployeesController.previewRemoveTourWeekEmployee);
router.delete(api.tourWeekEmployees.removeExecute.path, tourWeekEmployeesController.executeRemoveTourWeekEmployee);
router.post(api.tourWeekEmployees.tourAssignmentPreview.path, tourWeekEmployeesController.previewTourAssignment);

export default router;
