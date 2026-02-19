import { Router } from "express";
import { api } from "@shared/routes";
import * as backupController from "../controllers/backupController";

const router = Router();

router.get(api.backups.listLogs.path, backupController.listBackupLogs);
router.get(api.backups.download.path, backupController.downloadBackupFile);

export default router;

