import { Router } from "express";
import { api } from "@shared/routes";
import * as tagsController from "../controllers/tagsController";

const router = Router();

router.get(api.tags.list.path, tagsController.listTagCatalog);

export default router;
