import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as customerAddressesService from "../services/customerAddressesService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return;
  }
  if (err instanceof customerAddressesService.AddressError) {
    res.status(err.status).json({ code: err.code });
    return;
  }
  next(err);
}

export async function listCustomerAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const addresses = await customerAddressesService.listAddresses(customerId, roleKey);
    if (!addresses) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(addresses);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createCustomerAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const input = api.customerAddresses.create.input.parse(req.body);
    const address = await customerAddressesService.createAddress(customerId, input, roleKey);
    res.status(201).json(address);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateCustomerAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const addressId = Number(req.params.addressId);
    const input = api.customerAddresses.update.input.parse(req.body);
    const address = await customerAddressesService.updateAddress(customerId, addressId, input, roleKey);
    res.json(address);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function deleteCustomerAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const addressId = Number(req.params.addressId);
    const input = api.customerAddresses.remove.input.parse(req.body);
    await customerAddressesService.deleteAddress(customerId, addressId, input.version, roleKey);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listAddressCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const categories = await customerAddressesService.listCategories();
    res.json(categories);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createAddressCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const input = api.addressCategories.create.input.parse(req.body);
    const category = await customerAddressesService.createCategory(input, roleKey);
    res.status(201).json(category);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateAddressCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const categoryId = Number(req.params.id);
    const input = api.addressCategories.update.input.parse(req.body);
    const category = await customerAddressesService.updateCategory(categoryId, input, roleKey);
    res.json(category);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function deleteAddressCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const categoryId = Number(req.params.id);
    const input = api.addressCategories.remove.input.parse(req.body);
    await customerAddressesService.deleteCategory(categoryId, input.version, roleKey);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
}
