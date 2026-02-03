import { Router } from "express";
import { api } from "@shared/routes";
import * as appointmentsController from "../controllers/appointmentsController";

const router = Router();

router.get(api.appointments.get.path, appointmentsController.getAppointment);
router.post(api.appointments.create.path, appointmentsController.createAppointment);
router.patch(api.appointments.update.path, appointmentsController.updateAppointment);

export default router;
