import { Router } from "express";
import { api } from "@shared/routes";
import * as calendarMarkersController from "../controllers/calendarMarkersController";

const router = Router();

router.get(api.calendarMarkers.list.path, calendarMarkersController.listCalendarMarkers);
router.get(api.calendarMarkers.adminList.path, calendarMarkersController.listAdminCalendarMarkers);
router.post(api.calendarMarkers.create.path, calendarMarkersController.createCalendarMarker);
router.patch(api.calendarMarkers.update.path, calendarMarkersController.updateCalendarMarker);
router.delete(api.calendarMarkers.delete.path, calendarMarkersController.deleteCalendarMarker);

export default router;
