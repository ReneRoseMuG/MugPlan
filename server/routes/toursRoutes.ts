import { Router } from "express";
import { api } from "@shared/routes";
import * as toursController from "../controllers/toursController";

const router = Router();

router.get(api.tours.list.path, toursController.listTours);
router.post(api.tours.create.path, toursController.createTour);
router.patch(api.tours.update.path, toursController.updateTour);
router.delete(api.tours.delete.path, toursController.deleteTour);

export default router;
