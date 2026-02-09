import { Router } from "express";
import { api } from "@shared/routes";
import { attachRequestUserContext } from "../middleware/requestUserContext";
import * as userSettingsController from "../controllers/userSettingsController";

const router = Router();

router.get(api.userSettings.getResolved.path, attachRequestUserContext, userSettingsController.getResolvedSettings);
router.patch(api.userSettings.set.path, attachRequestUserContext, userSettingsController.setSetting);

export default router;
