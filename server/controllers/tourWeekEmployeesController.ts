import type { NextFunction, Request, Response } from "express";
import { api } from "@shared/routes";
import { ZodError } from "zod";
import { buildAppointmentEmployeeMessage, buildWeekAssignmentMessage } from "../lib/journalMessages";
import { getRequestActor } from "../lib/requestActor";
import * as appointmentsService from "../services/appointmentsService";
import * as journalService from "../services/journalService";
import * as tourWeekEmployeesService from "../services/tourWeekEmployeesService";

function canMutateWeekEmployees(req: Request): boolean {
  return req.userContext?.roleKey === "ADMIN" || req.userContext?.roleKey === "DISPONENT";
}

function handleServiceError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(422).json({ code: "VALIDATION_ERROR" });
    return true;
  }

  if (err instanceof tourWeekEmployeesService.TourWeekEmployeesError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
    });
    return true;
  }

  return false;
}

export async function listTourWeekEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tourId = Number(req.params.tourId);
    const result = await tourWeekEmployeesService.listWeekEmployeesByTour(tourId);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function listAvailableTourWeekEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.available.input.parse(req.query);
    const result = await tourWeekEmployeesService.listAvailableWeekEmployees(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewAddTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.addPreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewAddWeekEmployee(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function executeAddTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.addExecute.input.parse(req.body);
    const result = await tourWeekEmployeesService.executeAddWeekEmployee(tourId, input);
    const actor = getRequestActor(req);
    if (result.assignmentId && typeof result.employeeId === "number" && result.employeeName) {
      const assignmentSnapshot = {
        assignmentId: result.assignmentId,
        employeeId: result.employeeId,
        employeeName: result.employeeName,
        tourId,
        tourName: result.tourName ?? null,
        isoYear: result.isoYear ?? input.isoYear,
        isoWeek: result.isoWeek ?? input.isoWeek,
      };
      const weekContext = journalService.buildCalendarWeekContext({
        yearNumber: assignmentSnapshot.isoYear,
        weekNumber: assignmentSnapshot.isoWeek,
        tourId,
      });

      await journalService.recordJournalEntry({
        tableName: "employee_week_assignment",
        recordId: result.assignmentId,
        recordKey: `${tourId}-${assignmentSnapshot.isoYear}-${assignmentSnapshot.isoWeek}-${result.employeeId}`,
        op: "create",
        newValue: assignmentSnapshot,
        snapshot: assignmentSnapshot,
        actor,
        triggerKey: "employee.week_assignment.create",
        messageText: buildWeekAssignmentMessage(
          "erstellt",
          result.employeeName,
          assignmentSnapshot.isoYear,
          assignmentSnapshot.isoWeek,
          result.tourName ?? null,
        ),
        contexts: [
          weekContext,
          {
            tableName: "employee",
            recordId: result.employeeId,
            relationRole: "employee",
          },
        ],
      });

      for (const appointmentId of result.changedAppointmentIds ?? []) {
        const appointment = await appointmentsService.getAppointmentDetails(appointmentId);
        if (!appointment) continue;
        await journalService.recordJournalEntry({
          tableName: "appointment_employee",
          recordKey: `${appointmentId}-${result.employeeId}`,
          op: "create",
          newValue: {
            appointmentId,
            employeeId: result.employeeId,
            employeeName: result.employeeName,
          },
          snapshot: appointment,
          actor,
          triggerKey: "employee.week_assignment.appointment_add",
          messageText: buildAppointmentEmployeeMessage("hinzugefuegt", result.employeeName, appointment, appointmentId),
          contexts: [
            weekContext,
            {
              tableName: "appointment",
              recordId: appointmentId,
              relationRole: "appointment",
            },
            {
              tableName: "employee",
              recordId: result.employeeId,
              relationRole: "employee",
            },
          ],
        });
      }
    }
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewRemoveTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.removePreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewRemoveWeekEmployee(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function executeRemoveTourWeekEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const assignmentId = Number(req.params.assignmentId);
    const input = api.tourWeekEmployees.removeExecute.input.parse(req.body);
    const result = await tourWeekEmployeesService.executeRemoveWeekEmployee(tourId, assignmentId, input);
    const actor = getRequestActor(req);
    if (typeof result.employeeId === "number" && result.employeeName) {
      const assignmentSnapshot = {
        assignmentId,
        employeeId: result.employeeId,
        employeeName: result.employeeName,
        tourId,
        tourName: result.tourName ?? null,
        isoYear: result.isoYear ?? input.isoYear,
        isoWeek: result.isoWeek ?? input.isoWeek,
      };
      const weekContext = journalService.buildCalendarWeekContext({
        yearNumber: assignmentSnapshot.isoYear,
        weekNumber: assignmentSnapshot.isoWeek,
        tourId,
      });

      await journalService.recordJournalEntry({
        tableName: "employee_week_assignment",
        recordId: assignmentId,
        recordKey: `${tourId}-${assignmentSnapshot.isoYear}-${assignmentSnapshot.isoWeek}-${result.employeeId}`,
        op: "delete",
        oldValue: assignmentSnapshot,
        snapshot: assignmentSnapshot,
        actor,
        triggerKey: "employee.week_assignment.delete",
        messageText: buildWeekAssignmentMessage(
          "geloescht",
          result.employeeName,
          assignmentSnapshot.isoYear,
          assignmentSnapshot.isoWeek,
          result.tourName ?? null,
        ),
        contexts: [
          weekContext,
          {
            tableName: "employee",
            recordId: result.employeeId,
            relationRole: "employee",
          },
        ],
      });

      for (const appointmentId of result.changedAppointmentIds ?? []) {
        const appointment = await appointmentsService.getAppointmentDetails(appointmentId);
        if (!appointment) continue;
        await journalService.recordJournalEntry({
          tableName: "appointment_employee",
          recordKey: `${appointmentId}-${result.employeeId}`,
          op: "delete",
          oldValue: {
            appointmentId,
            employeeId: result.employeeId,
            employeeName: result.employeeName,
          },
          snapshot: appointment,
          actor,
          triggerKey: "employee.week_assignment.appointment_remove",
          messageText: buildAppointmentEmployeeMessage("entfernt", result.employeeName, appointment, appointmentId),
          contexts: [
            weekContext,
            {
              tableName: "appointment",
              recordId: appointmentId,
              relationRole: "appointment",
            },
            {
              tableName: "employee",
              recordId: result.employeeId,
              relationRole: "employee",
            },
          ],
        });
      }
    }
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}

export async function previewTourAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!canMutateWeekEmployees(req)) {
      res.status(403).json({ code: "FORBIDDEN" });
      return;
    }

    const tourId = Number(req.params.tourId);
    const input = api.tourWeekEmployees.tourAssignmentPreview.input.parse(req.body);
    const result = await tourWeekEmployeesService.previewTourAssignment(tourId, input);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    next(err);
  }
}
