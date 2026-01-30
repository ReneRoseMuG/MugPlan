import { Router } from "express";
import { api } from "@shared/routes";
import * as teamEmployeesController from "../controllers/teamEmployeesController";

const router = Router();

router.get(api.teamEmployees.list.path, teamEmployeesController.listTeamEmployees);
router.delete(api.teamEmployees.remove.path, teamEmployeesController.removeTeamEmployee);
router.post(api.teamEmployees.assign.path, teamEmployeesController.assignTeamEmployees);

export default router;
