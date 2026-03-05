import { Router } from "express";
import { api } from "@shared/routes";
import * as appointmentNotesController from "../controllers/appointmentNotesController";

const router = Router();

router.get(api.appointmentNotes.list.path, appointmentNotesController.listAppointmentNotes);
router.post(api.appointmentNotes.create.path, appointmentNotesController.createAppointmentNote);
router.delete(api.appointmentNotes.delete.path, appointmentNotesController.deleteAppointmentNote);

export default router;
