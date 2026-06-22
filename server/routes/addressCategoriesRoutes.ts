import { Router } from "express";
import { api } from "@shared/routes";
import * as customerAddressesController from "../controllers/customerAddressesController";

const router = Router();

router.get(api.addressCategories.list.path, customerAddressesController.listAddressCategories);
router.post(api.addressCategories.create.path, customerAddressesController.createAddressCategory);
router.patch(api.addressCategories.update.path, customerAddressesController.updateAddressCategory);
router.delete(api.addressCategories.remove.path, customerAddressesController.deleteAddressCategory);

export default router;
