import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/appointmentsRepository", () => ({
  withAppointmentTransaction: vi.fn(),
  getAppointmentTx: vi.fn(),
  getProjectTx: vi.fn(),
  hasEmployeeDateOverlapTx: vi.fn(),
  updateAppointmentWithVersionTx: vi.fn(),
  replaceAppointmentEmployeesTx: vi.fn(),
  getAppointmentWithEmployeesTx: vi.fn(),
  deleteAppointmentWithVersionTx: vi.fn(),
}));

vi.mock("../../../server/repositories/projectStatusRepository", () => ({
  getProjectStatusesByProjectIds: vi.fn(),
}));

vi.mock("../../../server/repositories/projectsRepository", () => ({
  updateProjectWithVersion: vi.fn(),
  deleteProjectWithVersion: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock("../../../server/repositories/notesRepository", () => ({
  updateNoteWithVersion: vi.fn(),
  deleteNoteWithVersion: vi.fn(),
  getNote: vi.fn(),
}));

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import * as notesRepository from "../../../server/repositories/notesRepository";
import * as projectsRepository from "../../../server/repositories/projectsRepository";
import {
  deleteAppointment,
  isAppointmentError,
  updateAppointment,
} from "../../../server/services/appointmentsService";
import { deleteNote, updateNote } from "../../../server/services/notesService";
import { deleteProject, updateProject } from "../../../server/services/projectsService";

const appointmentsRepoMock = vi.mocked(appointmentsRepository);
const projectsRepoMock = vi.mocked(projectsRepository);
const notesRepoMock = vi.mocked(notesRepository);

describe("PKG-01 Invariant: optimistic locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    appointmentsRepoMock.withAppointmentTransaction.mockImplementation(async (handler) => {
      const fakeTx = {} as Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];
      return handler(fakeTx);
    });
  });

  it("appointment update succeeds with matching version", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 11,
      version: 2,
      projectId: 3,
      tourId: null,
      title: "existing",
      description: null,
      startDate: new Date("2099-01-05T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.getProjectTx.mockResolvedValue({ id: 3, name: "P3" });
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(false);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "updated" });
    appointmentsRepoMock.replaceAppointmentEmployeesTx.mockResolvedValue(undefined);
    appointmentsRepoMock.getAppointmentWithEmployeesTx.mockResolvedValue({
      id: 11,
      version: 3,
      projectId: 3,
      employees: [],
      title: "P3",
      description: null,
      startDate: new Date("2099-01-06T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
    } as any);

    const result = await updateAppointment(
      11,
      {
        version: 2,
        projectId: 3,
        startDate: "2099-01-06",
        employeeIds: [],
      },
      "DISPONENT",
    );

    expect(result).toMatchObject({ id: 11, projectId: 3 });
    expect(appointmentsRepoMock.updateAppointmentWithVersionTx).toHaveBeenCalledOnce();
  });

  it("appointment update returns 409 VERSION_CONFLICT for stale version", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 12,
      version: 2,
      projectId: 3,
      tourId: null,
      title: "existing",
      description: null,
      startDate: new Date("2099-01-05T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.getProjectTx.mockResolvedValue({ id: 3, name: "P3" });
    appointmentsRepoMock.hasEmployeeDateOverlapTx.mockResolvedValue(false);
    appointmentsRepoMock.updateAppointmentWithVersionTx.mockResolvedValue({ kind: "version_conflict" });

    await expect(
      updateAppointment(
        12,
        {
          version: 1,
          projectId: 3,
          startDate: "2099-01-06",
          employeeIds: [],
        },
        "DISPONENT",
      ),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("appointment delete returns 409 VERSION_CONFLICT for wrong version", async () => {
    appointmentsRepoMock.getAppointmentTx.mockResolvedValue({
      id: 13,
      version: 7,
      projectId: 3,
      tourId: null,
      title: "existing",
      description: null,
      startDate: new Date("2099-01-05T00:00:00.000Z"),
      startTime: null,
      endDate: null,
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    appointmentsRepoMock.deleteAppointmentWithVersionTx.mockResolvedValue({ kind: "version_conflict" });

    let error: unknown;
    try {
      await deleteAppointment(13, 6, "DISPONENT");
    } catch (err) {
      error = err;
    }

    expect(isAppointmentError(error)).toBe(true);
    expect(error).toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("project update returns 409 VERSION_CONFLICT when repository reports version_conflict", async () => {
    projectsRepoMock.updateProjectWithVersion.mockResolvedValue({ kind: "version_conflict" });
    projectsRepoMock.getProject.mockResolvedValue({ id: 30 } as any);

    await expect(
      updateProject(30, { version: 2, customerId: 4, name: "Changed" } as any),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("project delete returns 409 VERSION_CONFLICT when repository reports version_conflict", async () => {
    projectsRepoMock.deleteProjectWithVersion.mockResolvedValue({ kind: "version_conflict" });
    projectsRepoMock.getProject.mockResolvedValue({ id: 30 } as any);

    await expect(deleteProject(30, 4)).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("note update returns 409 VERSION_CONFLICT when repository reports version_conflict", async () => {
    notesRepoMock.updateNoteWithVersion.mockResolvedValue({ kind: "version_conflict" });
    notesRepoMock.getNote.mockResolvedValue({ id: 40 } as any);

    await expect(
      updateNote(40, { version: 3, title: "New", content: "X" } as any),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("note delete returns 409 VERSION_CONFLICT when repository reports version_conflict", async () => {
    notesRepoMock.deleteNoteWithVersion.mockResolvedValue({ kind: "version_conflict" });
    notesRepoMock.getNote.mockResolvedValue({ id: 40 } as any);

    await expect(deleteNote(40, 3)).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });
});
