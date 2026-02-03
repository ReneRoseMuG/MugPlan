import type { InsertAppointment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as projectsRepository from "../repositories/projectsRepository";

const logPrefix = "[appointments-service]";

class AppointmentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isStartDateLocked(startDate: string): boolean {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue <= today;
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

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
