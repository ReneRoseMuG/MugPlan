import { Router } from "express";
import { api } from "@shared/routes";
import * as projectStatusController from "../controllers/projectStatusController";

const router = Router();

router.get(api.projectStatus.list.path, projectStatusController.listProjectStatuses);
router.post(api.projectStatus.create.path, projectStatusController.createProjectStatus);
router.put(api.projectStatus.update.path, projectStatusController.updateProjectStatus);
router.patch(api.projectStatus.toggleActive.path, projectStatusController.toggleProjectStatusActive);
router.delete(api.projectStatus.delete.path, projectStatusController.deleteProjectStatus);

export default router;
