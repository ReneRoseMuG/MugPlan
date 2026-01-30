import { Router } from "express";
import { api } from "@shared/routes";
import * as notesController from "../controllers/notesController";

const router = Router();

router.put(api.notes.update.path, notesController.updateNote);
router.patch(api.notes.togglePin.path, notesController.toggleNotePin);

export default router;
