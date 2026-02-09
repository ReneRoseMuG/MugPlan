import { Router } from "express";
import { api } from "@shared/routes";
import * as adminController from "../controllers/adminController";

const router = Router();

router.post(api.admin.resetDatabase.path, adminController.resetDatabase);

export default router;
