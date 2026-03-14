import { Router } from "express";
import { api } from "@shared/routes";
import * as employeeAbsencesController from "../controllers/employeeAbsencesController";

const router = Router();

router.get(api.employees.absences.list.path, employeeAbsencesController.listEmployeeAbsences);
router.get(api.employees.absences.get.path, employeeAbsencesController.getEmployeeAbsence);
router.post(api.employees.absences.create.path, employeeAbsencesController.createEmployeeAbsence);
router.put(api.employees.absences.update.path, employeeAbsencesController.updateEmployeeAbsence);
router.delete(api.employees.absences.delete.path, employeeAbsencesController.deleteEmployeeAbsence);
router.get(api.employees.absences.previewAppointments.path, employeeAbsencesController.previewAffectedAppointments);
router.post(api.employees.absences.bulkReplaceAppointments.path, employeeAbsencesController.bulkReplaceAffectedAppointments);

export default router;
