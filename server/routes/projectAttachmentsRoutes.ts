import { Router } from "express";
import { api } from "@shared/routes";
import * as projectAttachmentsController from "../controllers/projectAttachmentsController";

const router = Router();

router.get(api.projectAttachments.list.path, projectAttachmentsController.listProjectAttachments);
router.post(api.projectAttachments.create.path, projectAttachmentsController.createProjectAttachment);
router.delete(api.projectAttachments.delete.path, projectAttachmentsController.deleteProjectAttachment);
router.get(api.projectAttachments.download.path, projectAttachmentsController.downloadProjectAttachment);

export default router;
