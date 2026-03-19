import { Router } from "express";
import { api } from "@shared/routes";
import * as appointmentAttachmentsController from "../controllers/appointmentAttachmentsController";

const router = Router();

router.get(api.appointmentAttachments.list.path, appointmentAttachmentsController.listAppointmentAttachments);
router.post(api.appointmentAttachments.create.path, appointmentAttachmentsController.createAppointmentAttachment);
router.delete(api.appointmentAttachments.delete.path, appointmentAttachmentsController.deleteAppointmentAttachment);
router.get(api.appointmentAttachments.download.path, appointmentAttachmentsController.downloadAppointmentAttachment);

export default router;
