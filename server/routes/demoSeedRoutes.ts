import { Router } from "express";
import { api } from "@shared/routes";
import * as demoSeedController from "../controllers/demoSeedController";

const router = Router();

router.post(api.demoSeed.createRun.path, demoSeedController.createDemoSeedRun);
router.get(api.demoSeed.listRuns.path, demoSeedController.listDemoSeedRuns);
router.delete(api.demoSeed.purgeRun.path, demoSeedController.purgeDemoSeedRun);

export default router;
