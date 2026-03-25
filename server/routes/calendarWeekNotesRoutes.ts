import { Router } from "express";
import { api } from "@shared/routes";
import * as calendarWeekNotesController from "../controllers/calendarWeekNotesController";

const router = Router();

router.get(api.calendarWeekNotes.list.path, calendarWeekNotesController.listCalendarWeekNotes);
router.post(api.calendarWeekNotes.create.path, calendarWeekNotesController.createCalendarWeekNote);
router.delete(api.calendarWeekNotes.delete.path, calendarWeekNotesController.deleteCalendarWeekNote);

export default router;
