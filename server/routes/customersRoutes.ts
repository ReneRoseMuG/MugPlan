import { Router } from "express";
import { api } from "@shared/routes";
import * as customersController from "../controllers/customersController";

const router = Router();

router.get(api.customers.list.path, customersController.listCustomers);
router.get(api.customers.pagedList.path, customersController.listCustomersPaged);
router.get(api.customers.get.path, customersController.getCustomer);
router.post(api.customers.create.path, customersController.createCustomer);
router.patch(api.customers.update.path, customersController.updateCustomer);
router.get(api.customers.appointments.list.path, customersController.listAppointments);
router.get(api.customerTags.list.path, customersController.listCustomerTags);
router.post(api.customerTags.add.path, customersController.addCustomerTag);
router.delete(api.customerTags.remove.path, customersController.removeCustomerTag);

export default router;
