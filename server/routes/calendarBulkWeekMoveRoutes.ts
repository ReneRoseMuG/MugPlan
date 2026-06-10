import { Router } from "express";
import { api } from "@shared/routes";
import * as calendarBulkWeekMoveController from "../controllers/calendarBulkWeekMoveController";

const router = Router();

router.post(api.calendarBulkWeekMove.preview.path, calendarBulkWeekMoveController.previewBulkWeekMove);
router.post(api.calendarBulkWeekMove.execute.path, calendarBulkWeekMoveController.executeBulkWeekMove);

export default router;
