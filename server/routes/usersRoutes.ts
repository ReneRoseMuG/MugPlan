import { Router } from "express";
import { api } from "@shared/routes";
import * as usersController from "../controllers/usersController";

const router = Router();

router.get(api.users.list.path, usersController.listUsers);
router.patch(api.users.patch.path, usersController.patchUserRole);

export default router;
