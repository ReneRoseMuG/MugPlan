import { Router } from "express";
import { api } from "@shared/routes";
import * as appointmentsController from "../controllers/appointmentsController";

const router = Router();

router.get(api.appointments.get.path, appointmentsController.getAppointment);
router.get(api.projectAppointments.list.path, appointmentsController.listProjectAppointments);
router.get(api.calendarAppointments.list.path, appointmentsController.listCalendarAppointments);
router.post(api.appointments.create.path, appointmentsController.createAppointment);
router.patch(api.appointments.update.path, appointmentsController.updateAppointment);
router.delete(api.appointments.delete.path, appointmentsController.deleteAppointment);

export default router;
