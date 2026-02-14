import { Router } from "express";
import { api } from "@shared/routes";
import * as authController from "../controllers/authController";

const router = Router();

router.get(api.auth.setupStatus.path, authController.getSetupStatus);
router.post(api.auth.setupAdmin.path, authController.setupAdmin);
router.post(api.auth.login.path, authController.login);
router.post(api.auth.logout.path, authController.logout);
router.get("/api/health", authController.health);

export default router;
