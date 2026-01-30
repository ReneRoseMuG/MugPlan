import { Router } from "express";
import { api } from "@shared/routes";
import * as customersController from "../controllers/customersController";

const router = Router();

router.get(api.customers.list.path, customersController.listCustomers);
router.get(api.customers.get.path, customersController.getCustomer);
router.post(api.customers.create.path, customersController.createCustomer);
router.patch(api.customers.update.path, customersController.updateCustomer);

export default router;
