import { Router } from "express";
import { api } from "@shared/routes";
import * as journalController from "../controllers/journalController";

const router = Router();

router.get(api.journal.list.path, journalController.listJournalMessages);

export default router;
