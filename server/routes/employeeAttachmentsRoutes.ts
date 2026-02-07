import { Router } from "express";
import { api } from "@shared/routes";
import * as employeeAttachmentsController from "../controllers/employeeAttachmentsController";

const router = Router();

router.get(api.employeeAttachments.list.path, employeeAttachmentsController.listEmployeeAttachments);
router.post(api.employeeAttachments.create.path, employeeAttachmentsController.createEmployeeAttachment);
router.get(api.employeeAttachments.download.path, employeeAttachmentsController.downloadEmployeeAttachment);

export default router;
