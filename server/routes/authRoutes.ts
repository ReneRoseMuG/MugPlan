import { Router } from "express";
import { api } from "@shared/routes";
import * as authController from "../controllers/authController";

const router = Router();

router.get(api.auth.setupStatus.path, authController.getSetupStatus);
router.get(api.auth.sessionStatus.path, authController.getSessionStatus);
router.post(api.auth.setupAdmin.path, authController.setupAdmin);
router.post(api.auth.login.path, authController.login);
router.post(api.auth.twoFactorSetupVerify.path, authController.verifyTwoFactorSetup);
router.post(api.auth.twoFactorVerify.path, authController.verifyTwoFactor);
router.get(api.auth.quickLoginTargets.path, authController.getQuickLoginTargets);
router.post(api.auth.quickLogin.path, authController.quickLogin);
router.post(api.auth.logout.path, authController.logout);
router.get("/api/health", authController.health);

export default router;
