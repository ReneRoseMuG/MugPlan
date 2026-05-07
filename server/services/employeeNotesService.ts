import type { CreateNoteInput, InsertNote, Note } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";
import * as noteTemplatesRepository from "../repositories/noteTemplatesRepository";
import * as notesRepository from "../repositories/notesRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { EmployeesError } from "./employeesService";

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "DISPONENT" && roleKey !== "ADMIN") {
    throw new EmployeesError(403, "FORBIDDEN");
  }
}

async function getVisibleEmployee(employeeId: number, roleKey: CanonicalRoleKey) {
  const employee = await employeesRepository.getEmployee(employeeId);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;
  return employee;
}

export async function listEmployeeNotes(employeeId: number, roleKey: CanonicalRoleKey): Promise<Note[] | null> {
  const employee = await getVisibleEmployee(employeeId, roleKey);
  if (!employee) return null;
  return notesRepository.getEmployeeNotes(employeeId);
}

export async function createEmployeeNote(
  employeeId: number,
  data: CreateNoteInput & { templateId?: number },
  roleKey: CanonicalRoleKey,
): Promise<Note | null> {
  requireDispatcherOrAdmin(roleKey);
  const employee = await getVisibleEmployee(employeeId, roleKey);
  if (!employee) return null;

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
    noteData.cardColorLocked = template.cardColor !== null;
  }

  return notesRepository.withNotesTransaction(async (tx) => {
    const noteId = await notesRepository.createNoteTx(tx, noteData);
    await notesRepository.addEmployeeNoteRelationTx(tx, employeeId, noteId);
    const note = await notesRepository.getNoteTx(tx, noteId);
    if (!note) {
      throw new Error("NOTE_CREATE_READBACK_FAILED");
    }
    return note;
  });
}

export async function assertEmployeeNoteMutationAccess(employeeId: number, roleKey: CanonicalRoleKey): Promise<boolean> {
  requireDispatcherOrAdmin(roleKey);
  const employee = await getVisibleEmployee(employeeId, roleKey);
  return employee !== null;
}
