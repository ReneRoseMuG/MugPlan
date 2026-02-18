import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as customersService from "../services/customersService";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scope } = api.customers.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const customers = await customersService.listCustomers(roleKey, scope);
    res.json(customers);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof customersService.CustomersError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const customer = await customersService.getCustomer(Number(req.params.id), roleKey);
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
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customers.update.input.parse(req.body);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }
    const customer = await customersService.updateCustomer(Number(req.params.id), input, roleKey);
    if (!customer) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    res.json(customer);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    if (err instanceof customersService.CustomersError) {
      res.status(err.status).json({ code: err.code });
      return;
    }
    next(err);
  }
}
