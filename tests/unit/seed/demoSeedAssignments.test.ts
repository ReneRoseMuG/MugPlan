import { describe, expect, it } from "vitest";
import { assignEmployeesToGroups } from "../../../server/services/demoSeedAssignments";

describe("PKG-09 Unit: demoSeed group assignments", () => {
  it("distributes employees into three buckets with min=1 and max=3", () => {
    const assignment = assignEmployeesToGroups({
      employeeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      groupIds: [101, 102, 103],
      minPerGroup: 1,
      maxPerGroup: 3,
      randomInt: (min) => min,
    });

    for (const groupId of [101, 102, 103]) {
      const size = assignment.groupSizes.get(groupId) ?? 0;
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(3);
    }
  });

  it("marks overflow employees as unassigned when n > groupCount*max", () => {
    const employeeIds = Array.from({ length: 12 }, (_, index) => index + 1);
    const assignment = assignEmployeesToGroups({
      employeeIds,
      groupIds: [201, 202, 203],
      minPerGroup: 1,
      maxPerGroup: 3,
      randomInt: (min) => min,
    });

    expect(assignment.unassignedEmployeeIds.length).toBe(3);
    for (const groupId of [201, 202, 203]) {
      expect(assignment.groupSizes.get(groupId)).toBe(3);
    }

    for (const employeeId of assignment.unassignedEmployeeIds) {
      expect(assignment.byEmployeeId.get(employeeId)).toBeNull();
    }
  });
});

