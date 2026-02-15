type AssignEmployeesToGroupsParams = {
  employeeIds: number[];
  groupIds: number[];
  minPerGroup: number;
  maxPerGroup: number;
  randomInt: (min: number, max: number) => number;
};

export type GroupAssignmentResult = {
  byEmployeeId: Map<number, number | null>;
  groupSizes: Map<number, number>;
  unassignedEmployeeIds: number[];
};

function shuffle<T>(items: T[], randomInt: (min: number, max: number) => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function assignEmployeesToGroups(params: AssignEmployeesToGroupsParams): GroupAssignmentResult {
  const { employeeIds, groupIds, minPerGroup, maxPerGroup, randomInt } = params;
  if (groupIds.length === 0 || employeeIds.length === 0) {
    return {
      byEmployeeId: new Map(employeeIds.map((employeeId) => [employeeId, null])),
      groupSizes: new Map(groupIds.map((groupId) => [groupId, 0])),
      unassignedEmployeeIds: [...employeeIds],
    };
  }
  if (minPerGroup < 0 || maxPerGroup < 0 || maxPerGroup < minPerGroup) {
    throw new Error("Ungueltige Group-Limits.");
  }
  if (employeeIds.length < groupIds.length * minPerGroup) {
    throw new Error("Zu wenige Mitarbeitende fuer Mindestzuordnung.");
  }

  const shuffledEmployeeIds = shuffle(employeeIds, randomInt);
  const byEmployeeId = new Map<number, number | null>(employeeIds.map((employeeId) => [employeeId, null]));
  const groupSizes = new Map<number, number>(groupIds.map((groupId) => [groupId, 0]));

  let cursor = 0;
  for (const groupId of groupIds) {
    for (let i = 0; i < minPerGroup; i += 1) {
      const employeeId = shuffledEmployeeIds[cursor];
      cursor += 1;
      byEmployeeId.set(employeeId, groupId);
      groupSizes.set(groupId, (groupSizes.get(groupId) ?? 0) + 1);
    }
  }

  while (cursor < shuffledEmployeeIds.length) {
    const assignableGroups = groupIds.filter((groupId) => (groupSizes.get(groupId) ?? 0) < maxPerGroup);
    if (assignableGroups.length === 0) break;
    const nextGroupId = assignableGroups[randomInt(0, assignableGroups.length - 1)];
    const employeeId = shuffledEmployeeIds[cursor];
    cursor += 1;
    byEmployeeId.set(employeeId, nextGroupId);
    groupSizes.set(nextGroupId, (groupSizes.get(nextGroupId) ?? 0) + 1);
  }

  const unassignedEmployeeIds = shuffledEmployeeIds.slice(cursor);
  return {
    byEmployeeId,
    groupSizes,
    unassignedEmployeeIds,
  };
}

