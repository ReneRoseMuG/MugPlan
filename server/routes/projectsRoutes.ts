import { Router } from "express";
import { api } from "@shared/routes";
import * as projectsController from "../controllers/projectsController";

const router = Router();

router.get(api.projects.list.path, projectsController.listProjects);
router.get(api.projects.pagedList.path, projectsController.listProjectsPaged);
router.get(api.projects.get.path, projectsController.getProject);
router.post(api.projects.create.path, projectsController.createProject);
router.patch(api.projects.update.path, projectsController.updateProject);
router.delete(api.projects.delete.path, projectsController.deleteProject);
router.get(api.projects.orderItems.list.path, projectsController.listProjectOrderItems);
router.post(api.projects.orderItems.create.path, projectsController.createProjectOrderItem);
router.put(api.projects.orderItems.update.path, projectsController.updateProjectOrderItem);
router.delete(api.projects.orderItems.delete.path, projectsController.deleteProjectOrderItem);
router.get(api.projectTags.list.path, projectsController.listProjectTags);
router.post(api.projectTags.add.path, projectsController.addProjectTag);
router.delete(api.projectTags.remove.path, projectsController.removeProjectTag);

export default router;
