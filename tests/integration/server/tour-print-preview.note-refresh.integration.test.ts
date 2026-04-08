/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Tour-Druckvorschau-Endpoint bewertet das aktuelle print-Flag einer Terminnotiz bei jedem Request neu.
 * - Eine zuvor nicht druckbare Terminnotiz erscheint nach dem Update im naechsten Vorschau-Request.
 *
 * Fehlerfaelle:
 * - Die Druckvorschau haelt alte Notizdaten fest und zeigt eine frisch auf `print=true` gesetzte Terminnotiz weiterhin nicht an.
 * - Das Update der Terminnotiz wird beim Bauen des Tour-Reports nicht beruecksichtigt.
 *
 * Ziel:
 * Serverseitig absichern, dass die Tour-Druckvorschau nach einer Terminnotiz-Aktualisierung die neuen Druckdaten liefert.
 */
import { beforeAll, describe, expect, it } from "vitest";

import * as appointmentNotesService from "../../../server/services/appointmentNotesService";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  createTourFixture,
} from "../../helpers/testDataFactory";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("Tourenplan print preview note refresh integration", () => {
  it("includes an appointment note after its print flag is enabled and the preview is requested again", async () => {
    const admin = await loginAdminAgent(app);

    const tour = await createTourFixture("#2266aa");
    const employee = await createEmployeeFixtureWithOverrides({ firstName: "Nora", lastName: "Refresh" });
    const customer = await createCustomerFixtureWithOverrides({
      prefix: "TPP-NOTE-REFRESH",
      fullName: "Refresh, Kunde",
      phone: "+49 30 12345",
      postalCode: "10115",
      city: "Berlin",
      country: "Deutschland",
    });
    const project = await createProjectFixtureWithOverrides({
      prefix: "TPP-NOTE-REFRESH-PROJ",
      customerId: customer.id,
      name: "Refresh Projekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-06-17",
      endDate: "2099-06-17",
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    if (!appointment) {
      throw new Error("Expected appointment fixture to be created.");
    }

    const note = await appointmentNotesService.createAppointmentNote(appointment.id, {
      title: "Nachgereichte Drucknotiz",
      body: "<p>Diese Notiz wird spaeter fuer den Druck aktiviert.</p>",
      print: false,
      cardColor: "#22c55e",
    });

    await admin
      .get(`/api/tours/${tour.id}/print-preview?fromDate=2099-06-17&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const previewAppointment = res.body.appointments.find((entry: { id: number }) => entry.id === appointment.id);
        expect(previewAppointment).toBeTruthy();
        expect(previewAppointment.printNotes.map((entry: { title: string }) => entry.title)).not.toContain("Nachgereichte Drucknotiz");
      });

    await admin
      .put(`/api/notes/${note.id}`)
      .send({
        title: note.title,
        body: note.body,
        cardColor: note.cardColor,
        print: true,
        version: note.version,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.print).toBe(true);
      });

    await admin
      .get(`/api/tours/${tour.id}/print-preview?fromDate=2099-06-17&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const previewAppointment = res.body.appointments.find((entry: { id: number }) => entry.id === appointment.id);
        expect(previewAppointment).toBeTruthy();
        expect(previewAppointment.printNotes.map((entry: { title: string }) => entry.title)).toContain("Nachgereichte Drucknotiz");
      });
  });
});
