import { Router } from "express";
import { api } from "@shared/routes";
import * as projectNotesController from "../controllers/projectNotesController";

const router = Router();

router.get(api.projectNotes.list.path, projectNotesController.listProjectNotes);
router.post(api.projectNotes.create.path, projectNotesController.createProjectNote);

export default router;
