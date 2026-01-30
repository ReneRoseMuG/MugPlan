import { Router } from "express";
import { api } from "@shared/routes";
import * as eventsController from "../controllers/eventsController";

const router = Router();

router.get(api.events.list.path, eventsController.listEvents);
router.post(api.events.create.path, eventsController.createEvent);
router.delete(api.events.delete.path, eventsController.deleteEvent);

export default router;
