import { Router } from "express";
import { api } from "@shared/routes";
import * as employeeNotesController from "../controllers/employeeNotesController";

const router = Router();

router.get(api.employeeNotes.list.path, employeeNotesController.listEmployeeNotes);
router.post(api.employeeNotes.create.path, employeeNotesController.createEmployeeNote);
router.delete(api.employeeNotes.delete.path, employeeNotesController.deleteEmployeeNote);

export default router;
