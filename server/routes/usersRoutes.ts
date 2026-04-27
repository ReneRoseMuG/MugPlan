import { Router } from "express";
import { api } from "@shared/routes";
import * as usersController from "../controllers/usersController";

const router = Router();

router.get(api.users.list.path, usersController.listUsers);
router.post(api.users.create.path, usersController.createUser);
router.patch(api.users.patch.path, usersController.patchUser);
router.post(api.users.resetTwoFactor.path, usersController.resetUserTwoFactor);

export default router;
