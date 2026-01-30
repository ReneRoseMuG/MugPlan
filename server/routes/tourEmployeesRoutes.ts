import { Router } from "express";
import { api } from "@shared/routes";
import * as tourEmployeesController from "../controllers/tourEmployeesController";

const router = Router();

router.get(api.tourEmployees.list.path, tourEmployeesController.listTourEmployees);
router.delete(api.tourEmployees.remove.path, tourEmployeesController.removeTourEmployee);
router.post(api.tourEmployees.assign.path, tourEmployeesController.assignTourEmployees);

export default router;
