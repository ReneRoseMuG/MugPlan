import { Router } from "express";
import { api } from "@shared/routes";
import * as projectStatusRelationsController from "../controllers/projectStatusRelationsController";

const router = Router();

router.get(api.projectStatusRelations.list.path, projectStatusRelationsController.listProjectStatusRelations);
router.post(api.projectStatusRelations.add.path, projectStatusRelationsController.addProjectStatusRelation);
router.delete(api.projectStatusRelations.remove.path, projectStatusRelationsController.removeProjectStatusRelation);

export default router;
