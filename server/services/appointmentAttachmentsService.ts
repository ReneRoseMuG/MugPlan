import type { AppointmentAttachment, InsertAppointmentAttachment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";

const berlinFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

function getBerlinTodayDateString(): string {
  return berlinFormatter.format(new Date());
}

function toDateOnlyString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input.slice(0, 10);
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function appointmentExists(appointmentId: number): Promise<boolean> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  return appointment !== null;
}

export async function listAppointmentAttachments(appointmentId: number): Promise<AppointmentAttachment[]> {
  return appointmentsRepository.getAppointmentAttachments(appointmentId);
}

export async function getAppointmentAttachmentById(id: number): Promise<AppointmentAttachment | null> {
  return appointmentsRepository.getAppointmentAttachmentById(id);
}

export async function createAppointmentAttachment(data: InsertAppointmentAttachment): Promise<AppointmentAttachment> {
  return appointmentsRepository.createAppointmentAttachment(data);
}

export async function isAppointmentAttachmentHistorical(attachmentId: number): Promise<boolean> {
  const attachment = await appointmentsRepository.getAppointmentAttachmentById(attachmentId);
  if (!attachment) return false;
  const appointment = await appointmentsRepository.getAppointment(attachment.appointmentId);
  if (!appointment) return false;
  const startDateStr = toDateOnlyString(appointment.startDate);
  if (!startDateStr) return false;
  return startDateStr < getBerlinTodayDateString();
}

export async function softDeleteAppointmentAttachment(id: number): Promise<void> {
  await appointmentsRepository.deleteAppointmentAttachment(id);
}

export async function hardDeleteAppointmentAttachment(id: number): Promise<void> {
  await appointmentsRepository.deleteAppointmentAttachment(id);
}
