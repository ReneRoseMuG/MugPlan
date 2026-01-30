import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import * as customersService from "../services/customersService";
import { handleZodError } from "./validation";

export async function listCustomers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customers = await customersService.listCustomers();
    res.json(customers);
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customer = await customersService.getCustomer(Number(req.params.id));
    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customers.create.input.parse(req.body);
    const customer = await customersService.createCustomer(input);
    res.status(201).json(customer);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customers.update.input.parse(req.body);
    const customer = await customersService.updateCustomer(Number(req.params.id), input);
    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    if (handleZodError(err, res)) return;
    next(err);
  }
}
