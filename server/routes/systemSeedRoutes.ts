import { Router } from "express";
import { api } from "@shared/routes";
import * as systemSeedController from "../controllers/systemSeedController";

const router = Router();

router.post(api.admin.systemSeed.path, systemSeedController.applySystemSeed);

export default router;
