import type { AppointmentAttachment, InsertAppointmentAttachment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";

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
