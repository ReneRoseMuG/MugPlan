/**
 * Test Scope:
 *
 * Feature: FT06/FT07 - Team- und Tourversionierung
 * Use Case: UC Team/Tour update/delete mit Optimistic Locking
 *
 * Abgedeckte Regeln:
 * - Update mit stale Version liefert VERSION_CONFLICT.
 * - Delete mit stale Version liefert VERSION_CONFLICT.
 * - Ungueltige Version (<1) liefert VALIDATION_ERROR.
 *
 * Fehlerfaelle:
 * - Nicht vorhandene Datensaetze werden bei Konfliktpfad nicht faelschlich als erfolgreich behandelt.
 *
 * Ziel:
 * Service-Kontrakte fuer Team/Tour-Locking regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import * as teamsRepository from "../../../server/repositories/teamsRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";
import * as teamsService from "../../../server/services/teamsService";
import * as toursService from "../../../server/services/toursService";

describe("FT06/FT07 integration: team/tour versioning contracts", () => {

  it("returns VERSION_CONFLICT for stale team update/delete", async () => {
    const team = await teamsRepository.createTeam("Team 1", "#1188cc");

    await expect(
      teamsService.updateTeam(team.id, { color: "#00aa88", version: team.version + 1 }),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });

    await expect(
      teamsService.deleteTeam(team.id, team.version + 1),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("returns VALIDATION_ERROR for invalid team versions", async () => {
    const team = await teamsRepository.createTeam("Team 2", "#1188cc");

    await expect(
      teamsService.updateTeam(team.id, { color: "#00aa88", version: 0 }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });

    await expect(
      teamsService.deleteTeam(team.id, 0),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
  });

  it("returns VERSION_CONFLICT for stale tour update/delete", async () => {
    const tour = await toursRepository.createTour("Tour 1", "#1188cc");

    await expect(
      toursService.updateTour(tour.id, { name: tour.name, color: "#00aa88", version: tour.version + 1 }),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });

    await expect(
      toursService.deleteTour(tour.id, tour.version + 1),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("returns VALIDATION_ERROR for invalid tour versions", async () => {
    const tour = await toursRepository.createTour("Tour 2", "#1188cc");

    await expect(
      toursService.updateTour(tour.id, { name: tour.name, color: "#00aa88", version: 0 }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });

    await expect(
      toursService.deleteTour(tour.id, 0),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
  });
});
