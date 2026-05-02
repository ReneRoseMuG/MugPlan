import type { CreateNoteInput, InsertNote, Note } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as notesRepository from "../repositories/notesRepository";
import * as appointmentsService from "./appointmentsService";

export class AppointmentNotesError extends Error {
  status: number;
  code: "ABSENCE_APPOINTMENT_READONLY" | "PAST_APPOINTMENT_READONLY";

  constructor(status: number, code: "ABSENCE_APPOINTMENT_READONLY" | "PAST_APPOINTMENT_READONLY") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

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

function assertAppointmentAllowsNotes(appointment: { startDate: Date | string | null }): void {
  const startDate = toDateOnlyString(appointment.startDate);
  if (startDate && startDate < getBerlinTodayDateString()) {
    throw new AppointmentNotesError(409, "PAST_APPOINTMENT_READONLY");
  }
}

export async function listAppointmentNotes(appointmentId: number): Promise<Note[] | null> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  return notesRepository.getAppointmentNotes(appointmentId);
}

export async function createAppointmentNote(
  appointmentId: number,
  data: CreateNoteInput & { templateId?: number },
): Promise<Note | null> {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  assertAppointmentAllowsNotes(appointment);
  if (await appointmentsService.isAbsenceAppointmentReadOnlyOutsideEmployeeForm(appointmentId)) {
    throw new AppointmentNotesError(409, "ABSENCE_APPOINTMENT_READONLY");
  }

  const noteData: InsertNote = {
    title: data.title,
    body: data.body,
    cardColor: data.cardColor ?? null,
    print: data.print,
  };
  if (data.templateId) {
    const template = await noteTemplatesRepository.getNoteTemplate(data.templateId);
    if (!template) {
      throw new Error("Note template not found");
    }
    noteData.cardColor = template.cardColor ?? null;
    noteData.print = template.print;
    noteData.cardColorLocked = template.cardColor !== null;
  }

  return notesRepository.withNotesTransaction(async (tx) => {
    const noteId = await notesRepository.createNoteTx(tx, noteData);
    await notesRepository.addAppointmentNoteRelationTx(tx, appointmentId, noteId);
    const note = await notesRepository.getNoteTx(tx, noteId);
    if (!note) {
      throw new Error("NOTE_CREATE_READBACK_FAILED");
    }
    return note;
  });
}
