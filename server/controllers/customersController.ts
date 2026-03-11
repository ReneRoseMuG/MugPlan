import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as customersService from "../services/customersService";
import { logWarn } from "../lib/logger";

const logPrefix = "[customers-controller]";

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

export async function listCustomersPaged(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customers.pagedList.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const customers = await customersService.listCustomersPaged(roleKey, input);
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
    if (err instanceof customersService.CustomersError) {
      res.status(err.status).json({ code: err.code });
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

export async function listAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerId = Number(req.params.id);
    if (Number.isNaN(customerId)) {
      res.status(400).json({ message: "Ungueltige customerId" });
      return;
    }

    const { scope, fromDate } = api.customers.appointments.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfuegbar" });
      return;
    }

    const allowFromDateOverride = req.get("x-internal-debug") === "1" || process.env.NODE_ENV === "test";
    let effectiveFromDate: string | undefined;
    if (typeof fromDate === "string" && fromDate.length > 0) {
      if (scope !== "upcoming") {
        logWarn(`${logPrefix} list appointments ignored fromDate for scope=all customerId=${customerId}`);
      } else if (!allowFromDateOverride) {
        logWarn(`${logPrefix} list appointments ignored fromDate without debug flag customerId=${customerId}`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        res.status(400).json({ message: "Ungueltiges fromDate" });
        return;
      } else {
        effectiveFromDate = fromDate;
      }
    }

    const appointments = await appointmentsService.listCustomerAppointmentsByScope(
      customerId,
      scope,
      roleKey,
      { fromDateOverride: effectiveFromDate },
    );
    res.json(appointments);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(422).json({ code: "VALIDATION_ERROR" });
      return;
    }
    next(err);
  }
}
