import { Router } from "express";
import { api } from "@shared/routes";
import * as employeesController from "../controllers/employeesController";

const router = Router();

router.get(api.employees.list.path, employeesController.listEmployees);
router.get(api.employees.get.path, employeesController.getEmployee);
router.post(api.employees.create.path, employeesController.createEmployee);
router.post(api.employees.importCsv.path, employeesController.importEmployeesCsv);
router.put(api.employees.update.path, employeesController.updateEmployee);
router.patch(api.employees.toggleActive.path, employeesController.toggleEmployeeActive);
router.get(api.employees.currentAppointments.path, employeesController.listCurrentAppointments);
router.get(api.employees.appointments.list.path, employeesController.listAppointments);

export default router;
