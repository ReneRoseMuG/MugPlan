import { Router } from "express";
import { api } from "@shared/routes";
import * as noteTemplatesController from "../controllers/noteTemplatesController";

const router = Router();

router.get(api.noteTemplates.list.path, noteTemplatesController.listNoteTemplates);
router.post(api.noteTemplates.create.path, noteTemplatesController.createNoteTemplate);
router.put(api.noteTemplates.update.path, noteTemplatesController.updateNoteTemplate);
router.delete(api.noteTemplates.delete.path, noteTemplatesController.deleteNoteTemplate);

export default router;
