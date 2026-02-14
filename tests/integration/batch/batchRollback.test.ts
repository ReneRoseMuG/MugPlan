import { beforeEach, describe, expect, it } from "vitest";

import * as employeesService from "../../../server/services/employeesService";
import * as employeesRepository from "../../../server/repositories/employeesRepository";
import * as teamEmployeesService from "../../../server/services/teamEmployeesService";
import * as teamsRepository from "../../../server/repositories/teamsRepository";
import { resetDatabase } from "../../helpers/resetDatabase";

describe("PKG-06 Integration: batch rollback guarantees", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("rolls back complete batch when one item has stale version (no partial updates)", async () => {
    const team = await teamsRepository.createTeam("Batch Team", "#1188cc");

    const createdEmployees = await Promise.all([
      employeesService.createEmployee({ firstName: "A", lastName: "One", phone: null, email: null }),
      employeesService.createEmployee({ firstName: "B", lastName: "Two", phone: null, email: null }),
      employeesService.createEmployee({ firstName: "C", lastName: "Three", phone: null, email: null }),
      employeesService.createEmployee({ firstName: "D", lastName: "Four", phone: null, email: null }),
      employeesService.createEmployee({ firstName: "E", lastName: "Five", phone: null, email: null }),
    ]);

    const batchItems = createdEmployees.map((employee) => ({
      employeeId: employee.id,
      version: employee.version,
    }));
    batchItems[2] = {
      employeeId: batchItems[2].employeeId,
      version: 999999, // stale/wrong version to force version conflict inside transaction
    };

    await expect(teamEmployeesService.assignEmployeesToTeam(team.id, batchItems)).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
    });

    const after = await Promise.all(createdEmployees.map((employee) => employeesRepository.getEmployee(employee.id)));
    expect(after.every((employee) => employee !== null)).toBe(true);

    for (const employee of after) {
      expect(employee?.teamId ?? null).toBeNull();
      expect(employee?.version).toBe(1);
    }
  });
});
