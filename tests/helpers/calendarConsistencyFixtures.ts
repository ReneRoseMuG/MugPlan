import { addDays, addMonths, format, getISODay, parseISO, startOfMonth } from "date-fns";

import { getBerlinTodayDateString } from "../../client/src/lib/project-appointments";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "./testDataFactory";

function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function firstMondayOfMonth(monthStart: Date) {
  let cursor = monthStart;
  while (getISODay(cursor) !== 1) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export async function createCalendarConsistencyFixture() {
  const customerA = await createCustomerFixture("CALCCONS-CUST-A");
  const customerB = await createCustomerFixture("CALCCONS-CUST-B");
  await createEmployeeFixture("CALCCONS-EMP-A");
  await createEmployeeFixture("CALCCONS-EMP-B");

  const tourA = await createTourFixture("#2563eb");
  const tourB = await createTourFixture("#dc2626");

  const projectA = await createProjectFixture({
    prefix: "CALCCONS-PROJ-A",
    customerId: customerA.id,
    name: "Calendar Consistency Project A",
  });
  const projectB = await createProjectFixture({
    prefix: "CALCCONS-PROJ-B",
    customerId: customerB.id,
    name: "Calendar Consistency Project B",
  });

  // Keep the full suite safely in the future so fixture creation never hits
  // the historical appointment guard while still spanning multiple months.
  const anchorMonth = startOfMonth(addMonths(parseISO(getBerlinTodayDateString()), 2));
  const allAppointments = [];

  const sameDay = addDays(anchorMonth, 9);
  const overlapStart = addDays(anchorMonth, 14);
  const firstMondayNextMonth = firstMondayOfMonth(startOfMonth(addMonths(anchorMonth, 1)));
  const crossWeekStart = addDays(firstMondayNextMonth, -3);

  const sameDayEarlyA = await createAppointmentFixture({
    projectId: projectA.id,
    customerId: customerA.id,
    startDate: formatDate(sameDay),
    startTime: "08:00:00",
    tourId: tourA.id,
  });
  const sameDayLateA = await createAppointmentFixture({
    projectId: projectA.id,
    customerId: customerA.id,
    startDate: formatDate(sameDay),
    startTime: "15:30:00",
    tourId: tourA.id,
  });
  const sameDayNoonB = await createAppointmentFixture({
    projectId: projectB.id,
    customerId: customerB.id,
    startDate: formatDate(sameDay),
    startTime: "12:00:00",
    tourId: tourB.id,
  });
  const overlappingMultiDay1 = await createAppointmentFixture({
    projectId: projectA.id,
    customerId: customerA.id,
    startDate: formatDate(overlapStart),
    endDate: formatDate(addDays(overlapStart, 2)),
    tourId: tourA.id,
  });
  const overlappingMultiDay2 = await createAppointmentFixture({
    projectId: projectA.id,
    customerId: customerA.id,
    startDate: formatDate(addDays(overlapStart, 1)),
    endDate: formatDate(addDays(overlapStart, 3)),
    tourId: tourA.id,
  });
  const crossWeekSpan = await createAppointmentFixture({
    projectId: projectB.id,
    customerId: customerB.id,
    startDate: formatDate(crossWeekStart),
    endDate: formatDate(firstMondayNextMonth),
    tourId: tourB.id,
  });

  allAppointments.push(
    sameDayEarlyA,
    sameDayLateA,
    sameDayNoonB,
    overlappingMultiDay1,
    overlappingMultiDay2,
    crossWeekSpan,
  );

  const monthStarts = Array.from({ length: 5 }, (_, index) => startOfMonth(addMonths(anchorMonth, index)));
  const offsetsA = [1, 5, 11, 17, 21, 24];
  const offsetsB = [2, 7, 13, 18, 22, 25];

  for (const monthStart of monthStarts) {
    for (const offset of offsetsA) {
      allAppointments.push(
        await createAppointmentFixture({
          projectId: projectA.id,
          customerId: customerA.id,
          startDate: formatDate(addDays(monthStart, offset)),
          tourId: tourA.id,
        }),
      );
    }

    for (const offset of offsetsB) {
      allAppointments.push(
        await createAppointmentFixture({
          projectId: projectB.id,
          customerId: customerB.id,
          startDate: formatDate(addDays(monthStart, offset)),
          tourId: tourB.id,
        }),
      );
    }
  }

  return {
    tourA,
    tourB,
    allAppointments,
    sameDayEarlyA,
    sameDayLateA,
    sameDayNoonB,
    overlappingMultiDay1,
    overlappingMultiDay2,
    crossWeekSpan,
  };
}
