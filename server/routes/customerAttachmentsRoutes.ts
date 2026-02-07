import { Router } from "express";
import { api } from "@shared/routes";
import * as customerAttachmentsController from "../controllers/customerAttachmentsController";

const router = Router();

router.get(api.customerAttachments.list.path, customerAttachmentsController.listCustomerAttachments);
router.post(api.customerAttachments.create.path, customerAttachmentsController.createCustomerAttachment);
router.get(api.customerAttachments.download.path, customerAttachmentsController.downloadCustomerAttachment);

export default router;
