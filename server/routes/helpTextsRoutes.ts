import { Router } from "express";
import { api } from "@shared/routes";
import * as helpTextsController from "../controllers/helpTextsController";

const router = Router();

router.get(api.helpTexts.list.path, helpTextsController.listHelpTexts);
router.get(api.helpTexts.exportYaml.path, helpTextsController.exportHelpTextsYaml);
router.get(api.helpTexts.getById.path, helpTextsController.getHelpTextById);
router.get(api.helpTexts.getByKey.path, helpTextsController.getHelpTextByKey);
router.post(api.helpTexts.importYamlPreview.path, helpTextsController.previewHelpTextsYamlImport);
router.post(api.helpTexts.importYamlApply.path, helpTextsController.applyHelpTextsYamlImport);
router.post(api.helpTexts.seedMissingFromFrontend.path, helpTextsController.seedMissingHelpTextsFromFrontend);
router.post(api.helpTexts.create.path, helpTextsController.createHelpText);
router.put(api.helpTexts.update.path, helpTextsController.updateHelpText);
router.patch(api.helpTexts.toggleActive.path, helpTextsController.toggleHelpTextActive);
router.delete(api.helpTexts.delete.path, helpTextsController.deleteHelpText);

export default router;
