import { Router } from "express";
import { api } from "@shared/routes";
import * as userSettingsController from "../controllers/userSettingsController";

const router = Router();

router.get(api.userSettings.getResolved.path, userSettingsController.getResolvedSettings);
router.patch(api.userSettings.set.path, userSettingsController.setSetting);

export default router;
