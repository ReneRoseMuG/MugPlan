import type { Appointment, Employee, InsertAppointment, UpdateAppointment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as projectsRepository from "../repositories/projectsRepository";

const logAppointmentService = (message: string, details?: Record<string, unknown>) => {
  const payload = details ? ` :: ${JSON.stringify(details)}` : "";
  console.info(`[appointments:service] ${message}${payload}`);
};

const buildValidationError = (message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
};

const buildForbiddenError = (message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 403;
  return error;
};

const todayIsoDate = () => new Date().toISOString().split("T")[0];

const isLockedForEdit = (startDate: string, isAdmin: boolean) => {
  if (isAdmin) return false;
  return startDate <= todayIsoDate();
};

const resolveEndDate = (startDate: string, endDate?: string | null) => {
  return endDate && endDate.length > 0 ? endDate : startDate;
};

const validateDateOrder = (startDate: string, endDate: string) => {
  if (endDate < startDate) {
    logAppointmentService("validation failed: endDate before startDate", { startDate, endDate });
    throw buildValidationError("Enddatum darf nicht vor dem Startdatum liegen.");
  }
};

const validateProject = async (projectId: number) => {
  const project = await projectsRepository.getProject(projectId);
  if (!project) {
    logAppointmentService("validation failed: project missing", { projectId });
    throw buildValidationError("Projekt ist erforderlich.");
  }
  if (!project.isActive) {
    logAppointmentService("validation failed: project inactive", { projectId });
    throw buildValidationError("Projekt ist inaktiv.");
  }
};

const validateEmployeesActive = async (employeeIds: number[]) => {
  if (employeeIds.length === 0) return;
  const employees = await employeesRepository.getEmployeesByIds(employeeIds);
  const inactive = employees.filter((employee) => !employee.isActive).map((employee) => employee.id);
  if (employees.length !== employeeIds.length || inactive.length > 0) {
    logAppointmentService("validation failed: inactive or missing employees", {
      requested: employeeIds,
      inactive,
    });
    throw buildValidationError("Nur aktive Mitarbeiter dürfen zugewiesen werden.");
  }
};

export async function getAppointmentDetail(
  id: number,
): Promise<{ appointment: Appointment; employees: Employee[] } | null> {
  const appointment = await appointmentsRepository.getAppointment(id);
  if (!appointment) return null;
  const employees = await appointmentsRepository.getAppointmentEmployees(id);
  return { appointment, employees };
}

export async function createAppointment(
  data: InsertAppointment & { employeeIds?: number[] },
): Promise<Appointment> {
  if (!data.projectId) {
    logAppointmentService("validation failed: project required");
    throw buildValidationError("Projekt ist erforderlich.");
  }
  const employeeIds = data.employeeIds ?? [];
  await validateProject(data.projectId);
  await validateEmployeesActive(employeeIds);

  const resolvedEndDate = resolveEndDate(data.startDate, data.endDate ?? null);
  validateDateOrder(data.startDate, resolvedEndDate);

  const appointmentData: InsertAppointment = {
    ...data,
    endDate: resolvedEndDate,
    endTime: null,
  };

  logAppointmentService("creating appointment", {
    projectId: data.projectId,
    tourId: data.tourId ?? null,
    employeeCount: employeeIds.length,
  });

  return appointmentsRepository.createAppointmentWithEmployees(appointmentData, employeeIds);
}

export async function updateAppointment(
  id: number,
  data: UpdateAppointment & { employeeIds?: number[] },
  isAdmin: boolean,
): Promise<Appointment | null> {
  const existing = await appointmentsRepository.getAppointment(id);
  if (!existing) return null;

  if (isLockedForEdit(existing.startDate, isAdmin)) {
    logAppointmentService("edit blocked: appointment locked", { appointmentId: id, startDate: existing.startDate });
    throw buildForbiddenError("Termin ist ab Beginn des Starttages gesperrt.");
  }

  const employeeIds = data.employeeIds ?? [];
  const resolvedStartDate = data.startDate ?? existing.startDate;
  const resolvedEndDate = resolveEndDate(resolvedStartDate, data.endDate ?? existing.endDate ?? null);
  const resolvedStartTime = data.startTime !== undefined ? data.startTime : existing.startTime;
  const resolvedProjectId = data.projectId ?? existing.projectId;

  if (!resolvedProjectId) {
    logAppointmentService("validation failed: project required on update", { appointmentId: id });
    throw buildValidationError("Projekt ist erforderlich.");
  }

  await validateProject(resolvedProjectId);
  await validateEmployeesActive(employeeIds);
  validateDateOrder(resolvedStartDate, resolvedEndDate);

  const updatePayload: UpdateAppointment = {
    ...data,
    projectId: resolvedProjectId,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
    startTime: resolvedStartTime,
    endTime: null,
  };

  logAppointmentService("updating appointment", {
    appointmentId: id,
    projectId: resolvedProjectId,
    tourId: data.tourId ?? existing.tourId ?? null,
    employeeCount: employeeIds.length,
  });

  return appointmentsRepository.updateAppointmentWithEmployees(id, updatePayload, employeeIds);
}

export async function deleteAppointment(id: number, isAdmin: boolean): Promise<void> {
  const existing = await appointmentsRepository.getAppointment(id);
  if (!existing) {
    const error = new Error("Termin nicht gefunden") as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  if (isLockedForEdit(existing.startDate, isAdmin)) {
    logAppointmentService("delete blocked: appointment locked", { appointmentId: id, startDate: existing.startDate });
    throw buildForbiddenError("Termin ist ab Beginn des Starttages gesperrt.");
  }
  await appointmentsRepository.deleteAppointment(id);
}
