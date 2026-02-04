import type { InsertAppointment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as projectsRepository from "../repositories/projectsRepository";

const logPrefix = "[appointments-service]";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

class AppointmentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getBerlinTodayDateString(): string {
  return berlinFormatter.format(new Date());
}

function isStartDateLocked(startDate: string): boolean {
  const todayBerlin = getBerlinTodayDateString();
  return startDate <= todayBerlin;
}

function normalizeEmployeeIds(employeeIds?: number[]) {
  return Array.from(new Set(employeeIds ?? [])).filter((id) => Number.isFinite(id));
}

function validateDateRange(startDate: string, endDate?: string | null) {
  if (endDate && endDate < startDate) {
    throw new AppointmentError("Enddatum darf nicht vor dem Startdatum liegen", 400);
  }
}

async function ensureProjectExists(projectId: number) {
  const project = await projectsRepository.getProject(projectId);
  if (!project) {
    throw new AppointmentError("Projekt ist erforderlich", 400);
  }
  return project;
}

export async function getAppointmentDetails(id: number) {
  return appointmentsRepository.getAppointmentWithEmployees(id);
}

export async function createAppointment(
  data: {
    projectId: number;
    tourId?: number | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    employeeIds?: number[];
  },
) {
  console.log(`${logPrefix} create request projectId=${data.projectId}`);
  const project = await ensureProjectExists(data.projectId);
  validateDateRange(data.startDate, data.endDate ?? null);

  const employeeIds = normalizeEmployeeIds(data.employeeIds);

  const appointmentData: InsertAppointment = {
    projectId: data.projectId,
    tourId: data.tourId ?? null,
    title: project.name,
    description: null,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    startTime: data.startTime ?? null,
    endTime: null,
  };

  console.log(`${logPrefix} persisting appointment with ${employeeIds.length} employees`);
  return appointmentsRepository.createAppointment(appointmentData, employeeIds);
}

export async function updateAppointment(
  appointmentId: number,
  data: {
    projectId: number;
    tourId?: number | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    employeeIds?: number[];
  },
  isAdmin: boolean,
) {
  const existing = await appointmentsRepository.getAppointment(appointmentId);
  if (!existing) return null;

  if (!isAdmin && isStartDateLocked(existing.startDate)) {
    console.log(`${logPrefix} update blocked: appointmentId=${appointmentId} startDate=${existing.startDate}`);
    throw new AppointmentError("Termin ist ab dem Starttag gesperrt", 403);
  }

  const project = await ensureProjectExists(data.projectId);
  validateDateRange(data.startDate, data.endDate ?? null);

  if (existing.tourId !== (data.tourId ?? null)) {
    console.log(`${logPrefix} tour change detected appointmentId=${appointmentId}`);
  }

  const employeeIds = normalizeEmployeeIds(data.employeeIds);

  const appointmentData: Partial<InsertAppointment> = {
    projectId: data.projectId,
    tourId: data.tourId ?? null,
    title: project.name,
    description: null,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    startTime: data.startTime ?? null,
    endTime: null,
  };

  console.log(`${logPrefix} update appointmentId=${appointmentId} with ${employeeIds.length} employees`);
  return appointmentsRepository.updateAppointment(appointmentId, appointmentData, employeeIds);
}

export async function listProjectAppointments(
  projectId: number,
  fromDate: string | undefined,
  isAdmin: boolean,
) {
  const todayBerlin = getBerlinTodayDateString();
  const effectiveFromDate = fromDate ?? todayBerlin;

  if (!fromDate) {
    console.log(`${logPrefix} list appointments defaulting fromDate=${effectiveFromDate}`);
  } else {
    console.log(`${logPrefix} list appointments using fromDate=${effectiveFromDate}`);
  }

  console.log(`${logPrefix} list appointments projectId=${projectId} fromDate=${effectiveFromDate}`);
  const appointments = await appointmentsRepository.listAppointmentsByProjectFromDate(projectId, effectiveFromDate);
  console.log(`${logPrefix} list appointments result projectId=${projectId} count=${appointments.length}`);

  return appointments.map((appointment) => ({
    id: appointment.id,
    projectId: appointment.projectId,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    startTimeHour: appointment.startTime ? Number(appointment.startTime.slice(0, 2)) : null,
    isLocked: !isAdmin && isStartDateLocked(appointment.startDate),
  }));
}

export async function listEmployeeAppointments(employeeId: number, fromDate: string | undefined) {
  const todayBerlin = getBerlinTodayDateString();
  const effectiveFromDate = fromDate ?? todayBerlin;

  if (!fromDate) {
    console.log(`${logPrefix} list employee appointments defaulting fromDate=${effectiveFromDate}`);
  } else {
    console.log(`${logPrefix} list employee appointments using fromDate=${effectiveFromDate}`);
  }

  console.log(`${logPrefix} list employee appointments employeeId=${employeeId} fromDate=${effectiveFromDate}`);
  const appointments = await appointmentsRepository.listAppointmentsByEmployeeFromDate(employeeId, effectiveFromDate);
  console.log(`${logPrefix} list employee appointments result employeeId=${employeeId} count=${appointments.length}`);

  return appointments.map(({ appointment, projectName, customerName }) => ({
    id: appointment.id,
    projectId: appointment.projectId,
    title: appointment.title ?? projectName,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    startTimeHour: appointment.startTime ? Number(appointment.startTime.slice(0, 2)) : null,
    customerName,
  }));
}

export async function deleteAppointment(appointmentId: number, isAdmin: boolean) {
  const existing = await appointmentsRepository.getAppointment(appointmentId);
  if (!existing) return null;

  if (!isAdmin && isStartDateLocked(existing.startDate)) {
    console.log(`${logPrefix} delete blocked: appointmentId=${appointmentId} startDate=${existing.startDate}`);
    throw new AppointmentError("Termin ist ab dem Starttag gesperrt", 403);
  }

  console.log(`${logPrefix} delete appointmentId=${appointmentId}`);
  await appointmentsRepository.deleteAppointment(appointmentId);
  return existing;
}

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
