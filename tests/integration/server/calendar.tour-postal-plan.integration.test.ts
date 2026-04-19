/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - /api/calendar/tour-postal-plan liefert Tour-Vorschläge gruppiert nach Kalenderwoche.
 * - Stärkere Präfixe sortieren vor schwächeren Treffern innerhalb derselben Woche.
 * - Termine ohne Tour erscheinen nicht in den Vorschlägen.
 *
 * Fehlerfälle:
 * - Die API gruppiert nicht sauber nach Woche und Tour.
 * - Score, Label oder Trefferanzahl sind fachlich falsch sortiert.
 * - Unzugeordnete Termine tauchen als Tour-Vorschlag auf.
 *
 * Ziel:
 * Die neue Kalenderprojektion des Tour-PLZ-Plans gegen echte API-Responses absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, addWeeks, format, startOfISOWeek } from "date-fns";

import type express from "express";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as toursRepository from "../../../server/repositories/toursRepository";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";

let app: express.Express;
let seq = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createFixture() {
  const local = seq++;
  const tourExact = await toursRepository.createTour(`PLZ Exakt ${Date.now()}-${local}`, "#2563eb");
  const tourNear = await toursRepository.createTour(`PLZ Nah ${Date.now()}-${local}`, "#16a34a");

  const exactCustomerA = await customersService.createCustomer({
    customerNumber: `TPLZ-EX-A-${local}`,
    firstName: "Erika",
    lastName: `Exakt-${local}-A`,
    fullName: `Exakt-${local}-A, Erika`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: "26135",
    city: "Oldenburg",
    country: null,
    version: 1,
  });
  const exactCustomerB = await customersService.createCustomer({
    customerNumber: `TPLZ-EX-B-${local}`,
    firstName: "Erika",
    lastName: `Exakt-${local}-B`,
    fullName: `Exakt-${local}-B, Erika`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: "26135",
    city: "Oldenburg",
    country: null,
    version: 1,
  });
  const nearCustomer = await customersService.createCustomer({
    customerNumber: `TPLZ-NA-${local}`,
    firstName: "Nora",
    lastName: `Nah-${local}`,
    fullName: `Nah-${local}, Nora`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: "26139",
    city: "Oldenburg",
    country: null,
    version: 1,
  });
  const unassignedCustomer = await customersService.createCustomer({
    customerNumber: `TPLZ-UN-${local}`,
    firstName: "Una",
    lastName: `Unassigned-${local}`,
    fullName: `Unassigned-${local}, Una`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: "26135",
    city: "Oldenburg",
    country: null,
    version: 1,
  });

  const exactProjectA = await projectsService.createProject({
    name: `Projekt Exakt A ${local}`,
    customerId: exactCustomerA.id,
    orderNumber: `TPLZ-EX-A-${local}`,
    descriptionMd: null,
    version: 1,
  });
  const exactProjectB = await projectsService.createProject({
    name: `Projekt Exakt B ${local}`,
    customerId: exactCustomerB.id,
    orderNumber: `TPLZ-EX-B-${local}`,
    descriptionMd: null,
    version: 1,
  });
  const nearProject = await projectsService.createProject({
    name: `Projekt Nah ${local}`,
    customerId: nearCustomer.id,
    orderNumber: `TPLZ-NA-${local}`,
    descriptionMd: null,
    version: 1,
  });
  const unassignedProject = await projectsService.createProject({
    name: `Projekt Unassigned ${local}`,
    customerId: unassignedCustomer.id,
    orderNumber: `TPLZ-UN-${local}`,
    descriptionMd: null,
    version: 1,
  });

  await appointmentsService.createAppointment({
    projectId: exactProjectA.id,
    startDate: "2099-04-06",
    employeeIds: [],
    tourId: tourExact.id,
  });
  await appointmentsService.createAppointment({
    projectId: exactProjectB.id,
    startDate: "2099-04-07",
    employeeIds: [],
    tourId: tourExact.id,
  });
  await appointmentsService.createAppointment({
    projectId: nearProject.id,
    startDate: "2099-04-08",
    employeeIds: [],
    tourId: tourNear.id,
  });
  await appointmentsService.createAppointment({
    projectId: unassignedProject.id,
    startDate: "2099-04-09",
    employeeIds: [],
  });

  return { tourExact, tourNear };
}

describe("calendar tour postal plan integration", () => {
  it("liefert sortierte Vorschläge mit Score, Label und ohne unzugeordnete Termine", async () => {
    const agent = await loginAdminAgent(app);
    const { tourExact, tourNear } = await createFixture();

    const response = await agent
      .get("/api/calendar/tour-postal-plan?postalCode=26135&fromDate=2099-04-06&toDate=2099-05-03")
      .expect(200);

    type ResponseWeek = {
      isoWeek: number;
      suggestions: Array<{
        tourId: number;
        score: number;
        scoreLabel: string;
        matchedPostalCodes: string[];
        matchedAppointmentCount: number;
        appointments: Array<{ id: number; customer: { postalCode: string | null } }>;
        days: Array<{ date: string; appointments: Array<{ postalCode: string | null }> }>;
      }>;
    };

    const weeks = response.body as ResponseWeek[];
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.isoWeek).toBe(15);
    expect(weeks[0]?.suggestions).toHaveLength(2);
    expect(weeks[0]?.suggestions[0]).toMatchObject({
      tourId: tourExact.id,
      score: 5,
      scoreLabel: "exakt",
      matchedPostalCodes: ["26135"],
      matchedAppointmentCount: 2,
    });
    expect(weeks[0]?.suggestions[1]).toMatchObject({
      tourId: tourNear.id,
      score: 4,
      scoreLabel: "sehr nah",
      matchedPostalCodes: ["26139"],
      matchedAppointmentCount: 1,
    });
    expect(weeks[0]?.suggestions.some((suggestion) => suggestion.tourId === 0)).toBe(false);
    expect(
      weeks[0]?.suggestions.flatMap((suggestion) => suggestion.days.flatMap((day) => day.appointments.map((appointment) => appointment.postalCode))),
    ).not.toContain(null);
    expect(
      weeks[0]?.suggestions.flatMap((suggestion) => suggestion.appointments.map((appointment) => appointment.customer.postalCode)),
    ).not.toContain(null);
  });

  it("klammert laufende Woche serverseitig auf den Beginn der kommenden Woche", async () => {
    const agent = await loginAdminAgent(app);
    const local = seq++;
    const berlinToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const currentWeekStart = startOfISOWeek(new Date(`${berlinToday}T00:00:00`));
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const currentWeekDate = berlinToday;
    const nextWeekDate = format(addDays(nextWeekStart, 1), "yyyy-MM-dd");
    const tour = await toursRepository.createTour(`PLZ Clamp ${Date.now()}-${local}`, "#0f766e");
    const customer = await customersService.createCustomer({
      customerNumber: `TPLZ-CL-${local}`,
      firstName: "Clara",
      lastName: `Clamp-${local}`,
      fullName: `Clamp-${local}, Clara`,
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: "26135",
      city: "Oldenburg",
      country: null,
      version: 1,
    });
    const project = await projectsService.createProject({
      name: `Projekt Clamp ${local}`,
      customerId: customer.id,
      orderNumber: `TPLZ-CL-${local}`,
      descriptionMd: null,
      version: 1,
    });

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: currentWeekDate,
      employeeIds: [],
      tourId: tour.id,
    });
    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: nextWeekDate,
      employeeIds: [],
      tourId: tour.id,
    });

    const response = await agent
      .get(`/api/calendar/tour-postal-plan?postalCode=26135&fromDate=1900-01-01&toDate=${format(addWeeks(nextWeekStart, 3), "yyyy-MM-dd")}`)
      .expect(200);

    const weeks = response.body as Array<{ weekStartDate: string; suggestions: Array<{ appointments: Array<{ startDate: string }> }> }>;
    expect(
      weeks.flatMap((week) => week.suggestions.flatMap((suggestion) => suggestion.appointments.map((appointment) => appointment.startDate))),
    ).not.toContain(currentWeekDate);
    expect(
      weeks.flatMap((week) => week.suggestions.flatMap((suggestion) => suggestion.appointments.map((appointment) => appointment.startDate))),
    ).toContain(nextWeekDate);
  });
});
