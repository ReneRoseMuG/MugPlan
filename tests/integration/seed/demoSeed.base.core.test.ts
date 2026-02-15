import { beforeEach, describe, expect, it } from "vitest";
import * as demoSeedService from "../../../server/services/demoSeedService";
import * as teamsService from "../../../server/services/teamsService";
import * as toursService from "../../../server/services/toursService";
import * as employeesRepository from "../../../server/repositories/employeesRepository";
import * as projectsService from "../../../server/services/projectsService";
import * as projectStatusService from "../../../server/services/projectStatusService";
import { resetDatabase } from "../../helpers/resetDatabase";

async function createBaseRun(overrides?: Partial<{
  employees: number;
  customers: number;
  projects: number;
}>) {
  return demoSeedService.createSeedRun({
    runType: "base",
    employees: overrides?.employees ?? 20,
    customers: overrides?.customers ?? 6,
    projects: overrides?.projects ?? 8,
    generateAttachments: false,
    randomSeed: 1234,
    locale: "de",
    projectStatuses: [
      { title: "Neu", color: "#2563eb" },
      { title: "In Arbeit", color: "#d97706" },
      { title: "Erledigt", color: "#16a34a" },
    ],
  });
}

describe("PKG-09 Integration: demo seed base core", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates exactly three teams and three tours in base run", async () => {
    const summary = await createBaseRun();
    expect(summary.created.teams).toBe(3);
    expect(summary.created.tours).toBe(3);
  });

  it("assigns 1-3 employees per team/tour and leaves overflow unassigned", async () => {
    await createBaseRun({ employees: 20 });

    const teams = await teamsService.listTeams();
    const tours = await toursService.listTours();

    expect(teams.length).toBe(3);
    expect(tours.length).toBe(3);

    for (const team of teams) {
      const assigned = await employeesRepository.getEmployeesByTeam(team.id);
      expect(assigned.length).toBeGreaterThanOrEqual(1);
      expect(assigned.length).toBeLessThanOrEqual(3);
    }

    for (const tour of tours) {
      const assigned = await employeesRepository.getEmployeesByTour(tour.id);
      expect(assigned.length).toBeGreaterThanOrEqual(1);
      expect(assigned.length).toBeLessThanOrEqual(3);
    }

    const allEmployees = await employeesRepository.getEmployees("all");
    const hasUnassignedTeam = allEmployees.some((employee) => employee.teamId == null);
    const hasUnassignedTour = allEmployees.some((employee) => employee.tourId == null);
    expect(hasUnassignedTeam).toBe(true);
    expect(hasUnassignedTour).toBe(true);
  });

  it("assigns random 1-2 selected statuses per seeded project", async () => {
    await createBaseRun({ projects: 10 });
    const projects = await projectsService.listProjects("all", [], "all");
    const allowedTitles = new Set(["Neu", "In Arbeit", "Erledigt"]);

    expect(projects.length).toBeGreaterThan(0);

    for (const project of projects) {
      const statuses = await projectStatusService.listProjectStatusesByProject(Number(project.id));
      expect(statuses.length).toBeGreaterThanOrEqual(1);
      expect(statuses.length).toBeLessThanOrEqual(2);
      const uniqueIds = new Set(statuses.map((status) => status.id));
      expect(uniqueIds.size).toBe(statuses.length);
      for (const status of statuses) {
        expect(allowedTitles.has(status.title)).toBe(true);
      }
    }
  });

  it("rejects invalid base seed payload with deterministic 400 errors", async () => {
    await expect(
      demoSeedService.createSeedRun({
        runType: "base",
        employees: 2,
        customers: 4,
        projects: 5,
        generateAttachments: false,
        projectStatuses: [{ title: "Neu", color: "#2563eb" }],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Basis-Seed erfordert mindestens 3 Mitarbeitende.",
    });

    await expect(
      demoSeedService.createSeedRun({
        runType: "base",
        employees: 3,
        customers: 4,
        projects: 5,
        generateAttachments: false,
        projectStatuses: [],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Mindestens ein Projekt-Status fuer Basis-Seed erforderlich.",
    });

    await expect(
      demoSeedService.createSeedRun({
        runType: "base",
        employees: 3,
        customers: 4,
        projects: 5,
        generateAttachments: false,
        projectStatuses: [{ title: "   ", color: "#2563eb" }],
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Projekt-Status-Titel darf nicht leer sein.",
    });
  });
});

