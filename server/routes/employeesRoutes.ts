import { Router } from "express";
import { api } from "@shared/routes";
import * as employeesController from "../controllers/employeesController";

const router = Router();

router.get(api.employees.list.path, employeesController.listEmployees);
router.get(api.employees.get.path, employeesController.getEmployee);
router.get(api.employees.weekPlans.path, employeesController.listEmployeeWeekPlans);
router.get(api.employeeTags.list.path, employeesController.listEmployeeTags);
router.post(api.employees.create.path, employeesController.createEmployee);
router.post(api.employees.importCsv.path, employeesController.importEmployeesCsv);
router.put(api.employees.update.path, employeesController.updateEmployee);
router.post(api.employeeTags.add.path, employeesController.addEmployeeTag);
router.delete(api.employeeTags.remove.path, employeesController.removeEmployeeTag);
router.patch(api.employees.toggleActive.path, employeesController.toggleEmployeeActive);
router.delete(api.employees.delete.path, employeesController.deleteEmployee);
router.get(api.employees.currentAppointments.path, employeesController.listCurrentAppointments);
router.get(api.employees.appointments.list.path, employeesController.listAppointments);

export default router;
