import { Router } from "express";
import { api } from "@shared/routes";
import * as projectsController from "../controllers/projectsController";

const router = Router();

router.get(api.projects.list.path, projectsController.listProjects);
router.get(api.projects.get.path, projectsController.getProject);
router.post(api.projects.create.path, projectsController.createProject);
router.patch(api.projects.update.path, projectsController.updateProject);
router.delete(api.projects.delete.path, projectsController.deleteProject);

export default router;
