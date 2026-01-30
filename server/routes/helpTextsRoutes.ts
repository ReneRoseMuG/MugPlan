import { Router } from "express";
import { api } from "@shared/routes";
import * as helpTextsController from "../controllers/helpTextsController";

const router = Router();

router.get(api.helpTexts.getByKey.path, helpTextsController.getHelpTextByKey);
router.get(api.helpTexts.list.path, helpTextsController.listHelpTexts);
router.get(api.helpTexts.getById.path, helpTextsController.getHelpTextById);
router.post(api.helpTexts.create.path, helpTextsController.createHelpText);
router.put(api.helpTexts.update.path, helpTextsController.updateHelpText);
router.patch(api.helpTexts.toggleActive.path, helpTextsController.toggleHelpTextActive);
router.delete(api.helpTexts.delete.path, helpTextsController.deleteHelpText);

export default router;
