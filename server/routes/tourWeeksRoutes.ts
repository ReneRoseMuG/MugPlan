import { Router } from "express";
import { api } from "@shared/routes";
import * as tourWeeksController from "../controllers/tourWeeksController";

const router = Router();

router.post(api.tourWeeks.create.path, tourWeeksController.createTourWeek);
router.post(api.tourWeeks.block.path, tourWeeksController.blockTourWeek);
router.post(api.tourWeeks.unblock.path, tourWeeksController.unblockTourWeek);

export default router;
