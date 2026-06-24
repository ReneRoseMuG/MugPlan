/**
 * Test Scope:
 *
 * Abgedeckte Regeln (MS-68, FT 09):
 * - Beim Anlegen eines Kunden entsteht eine systemgepflegte Rechnungsadress-Zeile.
 * - Eine abweichende Lieferadresse (Kategorie DELIVERY) wird als wirksame Lieferadresse
 *   aufgeloest und erscheint in der Kalender-Aggregation; die Rechnungsadresse wird dabei
 *   nachweislich ausgeschlossen.
 * - Aenderung der Lieferadresse spiegelt sich im naechsten Kalenderabruf; Entfernen faellt
 *   auf die Rechnungsadresse zurueck.
 * - Die Rechnungsadress-Zeile ist pflegbar (Felder), behaelt aber ihre Rolle und ist nicht
 *   loeschbar; ihre Aenderungen werden in die flachen Kundenfelder gespiegelt.
 * - Optimistic Locking, Pflichtfeldvalidierung, Schutz der Rechnungsadress-Rolle sowie der
 *   geschuetzten Pflichtkategorien werden serverseitig erzwungen.
 *
 * Fehlerfaelle:
 * - Anlegen einer Adresse mit Rechnungsadress-Kategorie (409 ADDRESS_CATEGORY_PROTECTED).
 * - Entfernen der systemgepflegten Rechnungsadresse (409 ADDRESS_PROTECTED).
 * - Versionskonflikt (409 VERSION_CONFLICT), unvollstaendige Adresse (422), geschuetzte
 *   Kategorie loeschen (409 ADDRESS_CATEGORY_PROTECTED).
 *
 * Ziel:
 * Die serverseitige Aufloesung und Verwaltung der wirksamen Lieferadresse end-to-end
 * absichern, inklusive Ausschluss von Altbestand und Reaktion auf Aenderungen.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";
import type { SuperAgentTest } from "supertest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

type AddressItem = {
  id: number;
  categoryId: number;
  roleKey: string | null;
  postalCode: string | null;
  city: string | null;
  addressLine1: string | null;
  isSystemManaged: boolean;
  isEffectiveDelivery: boolean;
  version: number;
};

async function getCategories(admin: SuperAgentTest) {
  const res = await admin.get("/api/address-categories").expect(200);
  return res.body as Array<{ id: number; roleKey: string | null; isProtected: boolean; version: number }>;
}

async function listAddresses(admin: SuperAgentTest, customerId: number): Promise<AddressItem[]> {
  const res = await admin.get(`/api/customers/${customerId}/addresses`).expect(200);
  return res.body as AddressItem[];
}

async function calendarCustomer(admin: SuperAgentTest, appointmentId: number) {
  const res = await admin
    .get("/api/calendar/appointments?fromDate=2099-08-01&toDate=2099-08-31")
    .expect(200);
  const item = (res.body as Array<{ id: number; customer: { postalCode: string | null; city: string | null } }>)
    .find((entry) => entry.id === appointmentId);
  expect(item, "Termin nicht in Kalenderantwort gefunden").toBeDefined();
  return item!.customer;
}

async function setupCustomerWithAppointment(prefix: string) {
  const admin = await loginAdminAgent(app);
  const customer = await createCustomerFixtureWithOverrides({
    prefix,
    addressLine1: "Rechnungsweg 1",
    postalCode: "11111",
    city: "Billtown",
    country: "Deutschland",
  });
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: "2099-08-14",
  });
  return { admin, customer, appointment };
}

describe("FT09 integration: wirksame Lieferadresse und Adressverwaltung", () => {
  it("legt beim Kunden eine systemgepflegte Rechnungsadresse an und loest ohne Lieferadresse darauf auf", async () => {
    const { admin, customer, appointment } = await setupCustomerWithAppointment("ADDR-BILL");

    const addresses = await listAddresses(admin, customer.id);
    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toMatchObject({
      roleKey: "BILLING",
      postalCode: "11111",
      isSystemManaged: true,
      isEffectiveDelivery: true,
    });

    const customerInCalendar = await calendarCustomer(admin, appointment.id);
    expect(customerInCalendar.postalCode).toBe("11111");
    expect(customerInCalendar.city).toBe("Billtown");
  });

  it("setzt eine abweichende Lieferadresse, die in allen Konsumenten die Rechnungsadresse ersetzt", async () => {
    const { admin, customer, appointment } = await setupCustomerWithAppointment("ADDR-DELIV");
    const categories = await getCategories(admin);
    const deliveryCat = categories.find((c) => c.roleKey === "DELIVERY")!;

    const created = await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({
        categoryId: deliveryCat.id,
        addressLine1: "Lieferstrasse 9",
        postalCode: "22222",
        city: "Deliverytown",
        country: "Deutschland",
      })
      .expect(201);
    expect(created.body).toMatchObject({ roleKey: "DELIVERY", isEffectiveDelivery: true, postalCode: "22222" });

    const addresses = await listAddresses(admin, customer.id);
    expect(addresses).toHaveLength(2);
    const billing = addresses.find((a) => a.roleKey === "BILLING")!;
    const delivery = addresses.find((a) => a.roleKey === "DELIVERY")!;
    expect(billing.isEffectiveDelivery).toBe(false);
    expect(delivery.isEffectiveDelivery).toBe(true);

    // Konsument: Kalender zeigt die Lieferadresse, NICHT die Rechnungsadresse (Ausschluss).
    const customerInCalendar = await calendarCustomer(admin, appointment.id);
    expect(customerInCalendar.postalCode).toBe("22222");
    expect(customerInCalendar.city).toBe("Deliverytown");
    expect(customerInCalendar.postalCode).not.toBe("11111");
  });

  it("spiegelt Aenderungen der Lieferadresse und faellt nach dem Entfernen auf die Rechnungsadresse zurueck", async () => {
    const { admin, customer, appointment } = await setupCustomerWithAppointment("ADDR-REACT");
    const categories = await getCategories(admin);
    const deliveryCat = categories.find((c) => c.roleKey === "DELIVERY")!;

    const created = await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Lieferstrasse 9", postalCode: "22222", city: "Deliverytown", country: "Deutschland" })
      .expect(201);
    const addressId = created.body.id as number;
    const version = created.body.version as number;

    // Aenderung -> naechster Konsumentenabruf zeigt neuen Wert
    await admin
      .patch(`/api/customers/${customer.id}/addresses/${addressId}`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Lieferstrasse 9", postalCode: "33333", city: "Newcity", country: "Deutschland", version })
      .expect(200);
    let customerInCalendar = await calendarCustomer(admin, appointment.id);
    expect(customerInCalendar.postalCode).toBe("33333");

    // Entfernen -> Fallback auf Rechnungsadresse
    await admin
      .delete(`/api/customers/${customer.id}/addresses/${addressId}`)
      .send({ version: version + 1 })
      .expect(204);
    customerInCalendar = await calendarCustomer(admin, appointment.id);
    expect(customerInCalendar.postalCode).toBe("11111");
  });

  it("erzwingt Schutz- und Konsistenzregeln serverseitig", async () => {
    const { admin, customer } = await setupCustomerWithAppointment("ADDR-RULES");
    const categories = await getCategories(admin);
    const billingCat = categories.find((c) => c.roleKey === "BILLING")!;
    const deliveryCat = categories.find((c) => c.roleKey === "DELIVERY")!;

    // Rechnungsadress-Kategorie ist ueber das Adress-CRUD geschuetzt.
    await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({ categoryId: billingCat.id, addressLine1: "X 1", postalCode: "99999", city: "Y", country: "DE" })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("ADDRESS_CATEGORY_PROTECTED"));

    // Unvollstaendige Adresse wird abgelehnt.
    await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Nur Strasse" })
      .expect(422);

    // Systemgepflegte Rechnungsadress-Zeile darf nicht entfernt werden.
    const billingAddress = (await listAddresses(admin, customer.id)).find((a) => a.roleKey === "BILLING")!;
    await admin
      .delete(`/api/customers/${customer.id}/addresses/${billingAddress.id}`)
      .send({ version: billingAddress.version })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("ADDRESS_PROTECTED"));

    // Versionskonflikt beim Update.
    const created = await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Lieferstrasse 9", postalCode: "22222", city: "Deliverytown", country: "DE" })
      .expect(201);
    await admin
      .patch(`/api/customers/${customer.id}/addresses/${created.body.id}`)
      .send({ categoryId: deliveryCat.id, addressLine1: "L", postalCode: "44444", city: "Z", country: "DE", version: 999 })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("VERSION_CONFLICT"));

    // Zweite Lieferadresse (gleiche Kategorie) verletzt die Eindeutigkeit je Kategorie.
    await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Andere 2", postalCode: "55555", city: "Q", country: "DE" })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("ADDRESS_ROLE_CONFLICT"));
  });

  it("schuetzt die Pflicht-Katalogeintraege Rechnungs- und Lieferadresse", async () => {
    const admin = await loginAdminAgent(app);
    const categories = await getCategories(admin);
    const billingCat = categories.find((c) => c.roleKey === "BILLING")!;
    expect(billingCat.isProtected).toBe(true);
    expect(categories.find((c) => c.roleKey === "DELIVERY")!.isProtected).toBe(true);

    await admin
      .delete(`/api/address-categories/${billingCat.id}`)
      .send({ version: billingCat.version })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("ADDRESS_CATEGORY_PROTECTED"));
  });

  it("erlaubt das Pflegen der Rechnungsadresse und spiegelt sie in die flachen Kundenfelder", async () => {
    const { admin, customer, appointment } = await setupCustomerWithAppointment("ADDR-BILL-EDIT");
    const billing = (await listAddresses(admin, customer.id)).find((a) => a.roleKey === "BILLING")!;

    await admin
      .patch(`/api/customers/${customer.id}/addresses/${billing.id}`)
      .send({ addressLine1: "Rechnungsweg 7", postalCode: "44444", city: "Billcity", country: "Deutschland", version: billing.version })
      .expect(200);

    // Adresszeile ist aktualisiert und bleibt die Rechnungsadresse.
    const updatedBilling = (await listAddresses(admin, customer.id)).find((a) => a.roleKey === "BILLING")!;
    expect(updatedBilling).toMatchObject({ roleKey: "BILLING", postalCode: "44444", city: "Billcity", addressLine1: "Rechnungsweg 7" });

    // Spiegel: die flachen Kundenfelder tragen die neue Rechnungsadresse.
    const detail = await admin.get(`/api/customers/${customer.id}`).expect(200);
    expect(detail.body).toMatchObject({ addressLine1: "Rechnungsweg 7", postalCode: "44444", city: "Billcity" });

    // Konsument: ohne abweichende Lieferadresse zeigt der Kalender die neue Rechnungsadresse.
    const customerInCalendar = await calendarCustomer(admin, appointment.id);
    expect(customerInCalendar.postalCode).toBe("44444");
  });

  it("verhindert den Rollenwechsel der Rechnungsadresse", async () => {
    const { admin, customer } = await setupCustomerWithAppointment("ADDR-BILL-ROLE");
    const categories = await getCategories(admin);
    const deliveryCat = categories.find((c) => c.roleKey === "DELIVERY")!;
    const billing = (await listAddresses(admin, customer.id)).find((a) => a.roleKey === "BILLING")!;

    await admin
      .patch(`/api/customers/${customer.id}/addresses/${billing.id}`)
      .send({ categoryId: deliveryCat.id, addressLine1: "Rechnungsweg 1", postalCode: "11111", city: "Billtown", country: "Deutschland", version: billing.version })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe("ADDRESS_PROTECTED"));
  });
});
