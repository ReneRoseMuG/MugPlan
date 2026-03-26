import { Router } from "express";
import { api } from "@shared/routes";
import * as backupController from "../controllers/backupController";
import * as dumpController from "../controllers/dumpController";

const router = Router();

router.post(api.backups.runNow.path, backupController.runBackupNow);
router.get(api.backups.listLogs.path, backupController.listBackupLogs);
router.get(api.backups.download.path, backupController.downloadBackupFile);

router.post(api.dumps.create.path, dumpController.createDump);
router.get(api.dumps.list.path, dumpController.listDumps);
router.get(api.dumps.download.path, dumpController.downloadDump);
router.post(api.dumps.import.path, dumpController.importDump);
router.delete(api.dumps.delete.path, dumpController.deleteDump);

export default router;
