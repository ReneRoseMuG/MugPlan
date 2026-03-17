import { Router } from "express";
import { api } from "@shared/routes";
import * as masterDataController from "../controllers/masterDataController";

const router = Router();

router.get(api.masterData.productCategories.list.path, masterDataController.listProductCategories);
router.post(api.masterData.productCategories.create.path, masterDataController.createProductCategory);
router.put(api.masterData.productCategories.update.path, masterDataController.updateProductCategory);
router.delete(api.masterData.productCategories.delete.path, masterDataController.deleteProductCategory);
router.post(api.masterData.productCategories.importCsv.path, masterDataController.importProductCategoryCsv);
router.get(api.masterData.seed.employees.status.path, masterDataController.getEmployeesSeedStatusController);
router.post(api.masterData.seed.employees.apply.path, masterDataController.applyEmployeesSeedController);
router.post(api.masterData.seed.employees.export.path, masterDataController.exportEmployeesSeedController);

router.get(api.masterData.seed.helpTexts.status.path, masterDataController.getHelpTextsSeedStatusController);
router.post(api.masterData.seed.helpTexts.apply.path, masterDataController.applyHelpTextsSeedController);
router.post(api.masterData.seed.helpTexts.export.path, masterDataController.exportHelpTextsSeedController);

router.get(api.masterData.seed.productManagement.status.path, masterDataController.getProductManagementSeedStatusController);
router.post(api.masterData.seed.productManagement.apply.path, masterDataController.applyProductManagementSeedController);
router.post(api.masterData.seed.productManagement.export.path, masterDataController.exportProductManagementSeedController);

router.get(api.masterData.seed.noteTemplates.status.path, masterDataController.getNoteTemplatesSeedStatusController);
router.post(api.masterData.seed.noteTemplates.apply.path, masterDataController.applyNoteTemplatesSeedController);
router.post(api.masterData.seed.noteTemplates.export.path, masterDataController.exportNoteTemplatesSeedController);

router.get(api.masterData.seed.tags.status.path, masterDataController.getTagsSeedStatusController);
router.post(api.masterData.seed.tags.apply.path, masterDataController.applyTagsSeedController);
router.post(api.masterData.seed.tags.export.path, masterDataController.exportTagsSeedController);

router.get(api.masterData.seed.users.status.path, masterDataController.getUsersSeedStatusController);
router.post(api.masterData.seed.users.apply.path, masterDataController.applyUsersSeedController);
router.post(api.masterData.seed.users.export.path, masterDataController.exportUsersSeedController);

router.get(api.masterData.componentCategories.list.path, masterDataController.listComponentCategories);
router.post(api.masterData.componentCategories.create.path, masterDataController.createComponentCategory);
router.put(api.masterData.componentCategories.update.path, masterDataController.updateComponentCategory);
router.delete(api.masterData.componentCategories.delete.path, masterDataController.deleteComponentCategory);
router.post(api.masterData.componentCategories.importCsv.path, masterDataController.importComponentCategoryCsv);

router.get(api.masterData.products.list.path, masterDataController.listProducts);
router.post(api.masterData.products.create.path, masterDataController.createProduct);
router.put(api.masterData.products.update.path, masterDataController.updateProduct);
router.delete(api.masterData.products.delete.path, masterDataController.deleteProduct);

router.get(api.masterData.components.list.path, masterDataController.listComponents);
router.post(api.masterData.components.create.path, masterDataController.createComponent);
router.put(api.masterData.components.update.path, masterDataController.updateComponent);
router.delete(api.masterData.components.delete.path, masterDataController.deleteComponent);
router.get(api.masterData.componentSpecifications.listByComponent.path, masterDataController.listComponentSpecifications);
router.post(api.masterData.componentSpecifications.create.path, masterDataController.createComponentSpecification);
router.put(api.masterData.componentSpecifications.update.path, masterDataController.updateComponentSpecification);
router.delete(api.masterData.componentSpecifications.delete.path, masterDataController.deleteComponentSpecification);

router.get(api.masterData.tags.list.path, masterDataController.listTags);
router.post(api.masterData.tags.create.path, masterDataController.createTag);
router.put(api.masterData.tags.update.path, masterDataController.updateTag);
router.delete(api.masterData.tags.delete.path, masterDataController.deleteTag);

router.get(api.masterData.componentProducts.list.path, masterDataController.listComponentProducts);
router.put(api.masterData.componentProducts.replaceByComponent.path, masterDataController.replaceComponentProducts);

export default router;
