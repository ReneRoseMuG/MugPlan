import { Router } from "express";
import { api } from "@shared/routes";
import * as changeNotificationsController from "../controllers/changeNotificationsController";

const router = Router();

router.get(api.changeNotifications.stream.path, changeNotificationsController.streamChangeNotifications);

export default router;
