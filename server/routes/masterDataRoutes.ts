import { Router } from "express";
import { api } from "@shared/routes";
import * as masterDataController from "../controllers/masterDataController";

const router = Router();

router.get(api.masterData.productCategories.list.path, masterDataController.listProductCategories);
router.post(api.masterData.productCategories.create.path, masterDataController.createProductCategory);
router.put(api.masterData.productCategories.update.path, masterDataController.updateProductCategory);
router.delete(api.masterData.productCategories.delete.path, masterDataController.deleteProductCategory);

router.get(api.masterData.componentCategories.list.path, masterDataController.listComponentCategories);
router.post(api.masterData.componentCategories.create.path, masterDataController.createComponentCategory);
router.put(api.masterData.componentCategories.update.path, masterDataController.updateComponentCategory);
router.delete(api.masterData.componentCategories.delete.path, masterDataController.deleteComponentCategory);

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
