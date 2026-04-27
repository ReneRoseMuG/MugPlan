import { Router } from "express";
import { api } from "@shared/routes";
import * as systemSeedController from "../controllers/systemSeedController";

const router = Router();

router.get(api.admin.systemSeedPreview.path, systemSeedController.getSystemSeedPreview);
router.post(api.admin.systemSeedApply.path, systemSeedController.applySystemSeed);

export default router;
