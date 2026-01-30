import { Router } from "express";
import { api } from "@shared/routes";
import * as customerNotesController from "../controllers/customerNotesController";

const router = Router();

router.get(api.customerNotes.list.path, customerNotesController.listCustomerNotes);
router.post(api.customerNotes.create.path, customerNotesController.createCustomerNote);
router.delete(api.customerNotes.delete.path, customerNotesController.deleteCustomerNote);

export default router;
