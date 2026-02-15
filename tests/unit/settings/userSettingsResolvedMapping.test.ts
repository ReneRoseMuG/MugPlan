/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – User-Settings auflösen
 *
 * Abgedeckte Regeln:
 * - Resolved-Mapping liefert Scope-Versionen und resolvedVersion korrekt.
 * - Neues Global-Setting fuer Hover-Delay wird inkl. Version aufgeloest.
 *
 * Fehlerfälle:
 * - Keine persistierten Werte: Fallback auf DEFAULT ohne Versionen.
 *
 * Ziel:
 * Sicherstellen, dass neue und bestehende Settings konsistent aufgeloest werden.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/repositories/usersRepository", () => ({
  getUserWithRole: vi.fn(),
}));

vi.mock("../../../server/repositories/userSettingsRepository", () => ({
  listSettingCandidates: vi.fn(),
  upsertSettingValueWithVersion: vi.fn(),
  getGlobalSettingValue: vi.fn(),
}));

import * as usersRepository from "../../../server/repositories/usersRepository";
import * as userSettingsRepository from "../../../server/repositories/userSettingsRepository";
import { getResolvedSettingsForUser } from "../../../server/services/userSettingsService";

const usersRepoMock = vi.mocked(usersRepository);
const settingsRepoMock = vi.mocked(userSettingsRepository);

describe("PKG-08 user settings resolved mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps scope versions and resolvedVersion for USER resolved values", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "projects.viewMode",
        scopeType: "USER",
        scopeId: "1",
        valueJson: "table",
        version: 4,
        updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const projectsView = result.find((entry) => entry.key === "projects.viewMode");

    expect(projectsView).toBeDefined();
    expect(projectsView?.userVersion).toBe(4);
    expect(projectsView?.resolvedScope).toBe("USER");
    expect(projectsView?.resolvedVersion).toBe(4);
  });

  it("keeps version fields undefined when only default value resolves", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([]);

    const result = await getResolvedSettingsForUser(1);
    const projectsView = result.find((entry) => entry.key === "projects.viewMode");

    expect(projectsView).toBeDefined();
    expect(projectsView?.resolvedScope).toBe("DEFAULT");
    expect(projectsView?.userVersion).toBeUndefined();
    expect(projectsView?.globalVersion).toBeUndefined();
    expect(projectsView?.roleVersion).toBeUndefined();
    expect(projectsView?.resolvedVersion).toBeUndefined();
  });

  it("maps global version and resolved value for hoverPreviewOpenDelayMs", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "hoverPreviewOpenDelayMs",
        scopeType: "GLOBAL",
        scopeId: "global",
        valueJson: 640,
        version: 5,
        updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const hoverPreviewDelay = result.find((entry) => entry.key === "hoverPreviewOpenDelayMs");

    expect(hoverPreviewDelay).toBeDefined();
    expect(hoverPreviewDelay?.globalVersion).toBe(5);
    expect(hoverPreviewDelay?.resolvedValue).toBe(640);
    expect(hoverPreviewDelay?.resolvedScope).toBe("GLOBAL");
    expect(hoverPreviewDelay?.resolvedVersion).toBe(5);
  });
});
