import { Router } from "express";
import { api } from "@shared/routes";
import * as appointmentsController from "../controllers/appointmentsController";

const router = Router();

router.get(api.appointments.list.path, appointmentsController.listAppointmentsList);
router.get(api.appointments.get.path, appointmentsController.getAppointment);
router.get(api.projectAppointments.list.path, appointmentsController.listProjectAppointments);
router.get(api.tourAppointments.list.path, appointmentsController.listTourAppointments);
router.get(api.tourPrintPreview.get.path, appointmentsController.getTourPrintPreview);
router.get(api.calendarAppointments.list.path, appointmentsController.listCalendarAppointments);
router.get(api.calendarAppointments.weekLaneEmployeePreviews.path, appointmentsController.listCalendarWeekLaneEmployeePreviews);
router.get(api.calendarAppointments.blockedTourWeeks.path, appointmentsController.listCalendarBlockedTourWeeks);
router.post(api.appointments.create.path, appointmentsController.createAppointment);
router.post(api.appointments.tourChangePreview.path, appointmentsController.previewAppointmentTourChange);
router.patch(api.appointments.update.path, appointmentsController.updateAppointment);
router.patch(api.appointments.setDisplayMode.path, appointmentsController.setAppointmentDisplayMode);
router.post(api.appointments.cancel.path, appointmentsController.cancelAppointment);
router.post(api.appointments.park.path, appointmentsController.parkAppointment);
router.delete(api.appointments.delete.path, appointmentsController.deleteAppointment);
router.delete(api.appointmentEmployees.remove.path, appointmentsController.removeEmployeeFromAppointment);
router.get(api.appointmentTags.list.path, appointmentsController.listAppointmentTags);
router.post(api.appointmentTags.add.path, appointmentsController.addAppointmentTag);
router.delete(api.appointmentTags.remove.path, appointmentsController.removeAppointmentTag);

export default router;
