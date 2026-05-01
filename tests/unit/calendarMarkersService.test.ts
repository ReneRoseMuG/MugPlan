/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Gesetzliche Feiertage werden für Deutschland lokal berechnet.
 * - Bundesweite Feiertage erscheinen genau einmal.
 * - Regionale Feiertage werden nach Bundeslandkürzeln zusammengeführt.
 * - Admin-Marker werden über den Server-FS-Store gelesen und mit automatischen Markern kombiniert.
 * - Ungültige gespeicherte JSON-Daten blockieren die Kalenderanzeige nicht.
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: `calendarMarkersService` mit echter `ServerScopedFileStore`-Persistenz in einem temporären Testverzeichnis.
 * - Eindeutiger Nachweis: feste Feiertagsdaten `2026-05-01`, `2026-01-06` und eindeutiger Admin-Marker `Betriebsferien Jahreswechsel`.
 * - Realistische Daten: gültige Marker-Payloads mit Typ, Quelle, Scope, Version, Zeitraum und Bundeslandkürzeln.
 * - Kritische Assertion: bundesweite Feiertage erscheinen einmal, regionale States sind korrekt und fehlerhafte JSON-Dateien liefern weiter automatische Marker.
 * - False-Positive-Schutz: jeder Test nutzt ein frisches temporäres Base-Directory und setzt den File-Store danach zurück.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ServerScopedFileStore } from "../../server/services/serverScopedFileStore";
import {
  resetCalendarMarkersFileStoreForTests,
  setCalendarMarkersFileStoreForTests,
} from "../../server/repositories/calendarMarkersRepository";
import {
  createCalendarMarker,
  listEffectiveCalendarMarkers,
} from "../../server/services/calendarMarkersService";

let tempRoot = "";

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-calendar-markers-"));
  setCalendarMarkersFileStoreForTests(new ServerScopedFileStore({ baseDirectory: tempRoot }));
});

afterEach(async () => {
  resetCalendarMarkersFileStoreForTests();
  if (tempRoot) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

describe("calendarMarkersService", () => {
  it("liefert bundesweite Feiertage genau einmal", async () => {
    const markers = await listEffectiveCalendarMarkers("ADMIN", {
      fromDate: "2026-05-01",
      toDate: "2026-05-01",
    });

    const maifeiertag = markers.filter((marker) => marker.name === "Maifeiertag");
    expect(maifeiertag).toHaveLength(1);
    expect(maifeiertag[0]).toMatchObject({
      date: "2026-05-01",
      type: "public_holiday",
      source: "automatic",
      scope: "national",
      states: [],
      active: true,
    });
  });

  it("fasst regionale Feiertage nach Bundesländern zusammen", async () => {
    const markers = await listEffectiveCalendarMarkers("ADMIN", {
      fromDate: "2026-01-06",
      toDate: "2026-01-06",
    });

    const holiday = markers.find((marker) => marker.name === "Heilige Drei Könige");
    expect(holiday).toMatchObject({
      date: "2026-01-06",
      scope: "regional",
      states: ["BW", "BY", "ST"],
    });
  });

  it("kombiniert aktive Admin-Marker und automatische Feiertage", async () => {
    const marker = await createCalendarMarker("ADMIN", {
      date: "2026-12-24",
      endDate: "2026-12-31",
      name: "Betriebsferien Jahreswechsel",
      type: "company_vacation",
      source: "admin",
      scope: "company",
      states: [],
      active: true,
      note: "Testdaten",
    });

    const markers = await listEffectiveCalendarMarkers("LESER", {
      fromDate: "2026-12-24",
      toDate: "2026-12-26",
    });

    expect(markers.some((entry) => entry.id === marker.id)).toBe(true);
    expect(markers.some((entry) => entry.name === "1. Weihnachtstag")).toBe(true);
  });

  it("ignoriert ungültige gespeicherte JSON-Daten beim Kalenderlesen", async () => {
    const targetDirectory = path.join(tempRoot, "global", "calendar-markers");
    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(path.join(targetDirectory, "admin-markers.json"), "{", "utf8");

    const markers = await listEffectiveCalendarMarkers("DISPONENT", {
      fromDate: "2026-05-01",
      toDate: "2026-05-01",
    });

    expect(markers.map((marker) => marker.name)).toContain("Maifeiertag");
  });
});
