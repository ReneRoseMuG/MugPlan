import type { Request, Response, NextFunction } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import * as appointmentsService from "../services/appointmentsService";
import * as customersService from "../services/customersService";
import { logWarn } from "../lib/logger";
import { getRequestActor } from "../lib/requestActor";
import {
  buildCreateMessage,
  buildTagMessage,
  buildUpdateMessage,
} from "../lib/journalMessages";
import * as journalService from "../services/journalService";

const logPrefix = "[customers-controller]";

function getRoleKeyFromRequest(req: Request) {
  return req.userContext?.roleKey;
}

function parseTagIds(value: unknown): number[] {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : [value];
  const ids = rawValues
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return Array.from(new Set(ids));
}

export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = api.customers.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customers = await customersService.listCustomers(roleKey, input.scope, parseTagIds(input.tagIds));
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }

    const customers = await customersService.listCustomersPaged(roleKey, {
      ...input,
      tagIds: parseTagIds(input.tagIds),
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customer = await customersService.createCustomer(input, roleKey);
    await journalService.recordJournalEntry({
      tableName: "customer",
      recordId: customer.id,
      op: "create",
      snapshot: customer,
      newValue: customer,
      actor: getRequestActor(req),
      triggerKey: "customer.create",
      messageText: buildCreateMessage("customer", customer, customer.id),
    });
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
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.id);
    const before = await customersService.getCustomer(customerId, roleKey);
    const customer = await customersService.updateCustomer(customerId, input, roleKey);
    if (!customer) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    await journalService.recordJournalEntry({
      tableName: "customer",
      recordId: customer.id,
      op: "update",
      oldValue: before,
      newValue: customer,
      snapshot: customer,
      actor: getRequestActor(req),
      triggerKey: "customer.update",
      messageText: buildUpdateMessage("customer", customer, customer.id),
    });
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
      res.status(400).json({ message: "Ungültige customerId" });
      return;
    }

    const { scope, fromDate } = api.customers.appointments.list.input.parse(req.query);
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
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
        res.status(400).json({ message: "Ungültiges fromDate" });
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

export async function listCustomerTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const relations = await customersService.listCustomerTagRelations(customerId, roleKey);
    if (!relations) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(relations);
  } catch (err) {
    next(err);
  }
}

export async function addCustomerTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const input = api.customerTags.add.input.parse(req.body);
    const relation = await customersService.addCustomerTag(customerId, input.tagId, roleKey);
    if (!relation) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    const customer = await customersService.getCustomer(customerId, roleKey);
    await journalService.recordJournalEntry({
      tableName: "customer",
      recordId: customerId,
      op: "tag_add",
      newValue: { tagId: relation.tag.id, tagName: relation.tag.name },
      snapshot: customer,
      actor: getRequestActor(req),
      triggerKey: "customer.tag.add",
      messageText: buildTagMessage("hinzugefügt", "customer", customer, relation.tag.name, customerId),
    });
    res.status(201).json(relation);
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

export async function removeCustomerTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleKey = getRoleKeyFromRequest(req);
    if (!roleKey) {
      res.status(500).json({ message: "Rollenkontext nicht verfügbar" });
      return;
    }
    const customerId = Number(req.params.customerId);
    const tagId = Number(req.params.tagId);
    const input = api.customerTags.remove.input.parse(req.body);
    const [customer, existingRelations] = await Promise.all([
      customersService.getCustomer(customerId, roleKey),
      customersService.listCustomerTagRelations(customerId, roleKey),
    ]);
    const removedTag = existingRelations?.find((relation) => relation.tag.id === tagId)?.tag ?? null;
    const result = await customersService.removeCustomerTag(customerId, tagId, input.version, roleKey);
    if (result === null) {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
    if (removedTag) {
      await journalService.recordJournalEntry({
        tableName: "customer",
        recordId: customerId,
        op: "tag_remove",
        oldValue: { tagId: removedTag.id, tagName: removedTag.name },
        snapshot: customer,
        actor: getRequestActor(req),
        triggerKey: "customer.tag.remove",
        messageText: buildTagMessage("entfernt", "customer", customer, removedTag.name, customerId),
      });
    }
    res.status(204).send();
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
