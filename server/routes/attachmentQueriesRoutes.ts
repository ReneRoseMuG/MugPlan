import { Router } from "express";
import { api } from "@shared/routes";
import * as attachmentQueriesController from "../controllers/attachmentQueriesController";

const router = Router();

router.get(
  api.customerAttachmentAggregates.projectAttachmentsByCustomer.path,
  attachmentQueriesController.listCustomerProjectAttachments,
);
router.post(
  api.attachmentDuplicates.checkOriginalName.path,
  attachmentQueriesController.checkAttachmentDuplicateByOriginalName,
);
router.get(
  api.appointmentAttachmentContext.get.path,
  attachmentQueriesController.getAppointmentAttachmentContext,
);

export default router;
