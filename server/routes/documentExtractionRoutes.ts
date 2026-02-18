import { Router } from "express";
import { api } from "@shared/routes";
import * as documentExtractionController from "../controllers/documentExtractionController";

const router = Router();

router.post(api.documentExtraction.extract.path, documentExtractionController.extractDocument);
router.post(api.documentExtraction.checkCustomerDuplicate.path, documentExtractionController.checkCustomerDuplicate);
router.post(api.documentExtraction.resolveCustomerByNumber.path, documentExtractionController.resolveCustomerByNumber);

export default router;
