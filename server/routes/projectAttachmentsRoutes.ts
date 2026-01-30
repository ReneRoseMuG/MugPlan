import { Router } from "express";
import { api } from "@shared/routes";
import * as projectAttachmentsController from "../controllers/projectAttachmentsController";

const router = Router();

router.get(api.projectAttachments.list.path, projectAttachmentsController.listProjectAttachments);
router.delete(api.projectAttachments.delete.path, projectAttachmentsController.deleteProjectAttachment);

export default router;
