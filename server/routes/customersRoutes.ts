import { Router } from "express";
import { api } from "@shared/routes";
import * as customersController from "../controllers/customersController";
import * as customerAddressesController from "../controllers/customerAddressesController";

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
router.get(api.customerAddresses.list.path, customerAddressesController.listCustomerAddresses);
router.post(api.customerAddresses.create.path, customerAddressesController.createCustomerAddress);
router.patch(api.customerAddresses.update.path, customerAddressesController.updateCustomerAddress);
router.delete(api.customerAddresses.remove.path, customerAddressesController.deleteCustomerAddress);

export default router;
