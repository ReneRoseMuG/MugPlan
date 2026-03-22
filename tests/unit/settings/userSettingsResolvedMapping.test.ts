/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – User-Settings auflösen
 *
 * Abgedeckte Regeln:
 * - Resolved-Mapping liefert Scope-Versionen und resolvedVersion korrekt.
 * - Neues Global-Setting fuer Hover-Delay wird inkl. Version aufgeloest.
 * - Neues Global-Setting fuer Toast-Desktop-Position wird inkl. Version aufgeloest.
 * - Neues USER-Setting fuer Hilfetext-Preview-Groesse wird inkl. Version aufgeloest.
 * - FT03-Settings fuer boolean/string/enum werden im USER-Scope korrekt aufgeloest.
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

  it("maps global version and resolved value for toastDesktopPosition", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "toastDesktopPosition",
        scopeType: "GLOBAL",
        scopeId: "global",
        valueJson: "top-left",
        version: 6,
        updatedAt: new Date("2026-02-18T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const toastPosition = result.find((entry) => entry.key === "toastDesktopPosition");

    expect(toastPosition).toBeDefined();
    expect(toastPosition?.globalVersion).toBe(6);
    expect(toastPosition?.resolvedValue).toBe("top-left");
    expect(toastPosition?.resolvedScope).toBe("GLOBAL");
    expect(toastPosition?.resolvedVersion).toBe(6);
  });

  it("maps FT03 week lane settings with USER scope and versions", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "calendar.weekLanes.isCollapsed",
        scopeType: "USER",
        scopeId: "1",
        valueJson: true,
        version: 2,
        updatedAt: new Date("2026-02-17T00:00:00.000Z"),
        updatedBy: 1,
      },
      {
        settingKey: "calendar.weekLanes.expandedLaneId",
        scopeType: "USER",
        scopeId: "1",
        valueJson: "tour-42",
        version: 3,
        updatedAt: new Date("2026-02-17T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const collapsedSetting = result.find((entry) => entry.key === "calendar.weekLanes.isCollapsed");
    const expandedLaneSetting = result.find((entry) => entry.key === "calendar.weekLanes.expandedLaneId");

    expect(collapsedSetting).toBeDefined();
    expect(collapsedSetting?.type).toBe("boolean");
    expect(collapsedSetting?.resolvedValue).toBe(true);
    expect(collapsedSetting?.resolvedScope).toBe("USER");
    expect(collapsedSetting?.resolvedVersion).toBe(2);

    expect(expandedLaneSetting).toBeDefined();
    expect(expandedLaneSetting?.type).toBe("string");
    expect(expandedLaneSetting?.resolvedValue).toBe("tour-42");
    expect(expandedLaneSetting?.resolvedScope).toBe("USER");
    expect(expandedLaneSetting?.resolvedVersion).toBe(3);
  });

  it("maps FT03 week appointment display mode with USER scope and version", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "calendar.weekAppointmentDisplayMode",
        scopeType: "USER",
        scopeId: "1",
        valueJson: "compact",
        version: 8,
        updatedAt: new Date("2026-03-06T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const displayModeSetting = result.find((entry) => entry.key === "calendar.weekAppointmentDisplayMode");

    expect(displayModeSetting).toBeDefined();
    expect(displayModeSetting?.type).toBe("enum");
    expect(displayModeSetting?.userVersion).toBe(8);
    expect(displayModeSetting?.resolvedValue).toBe("compact");
    expect(displayModeSetting?.resolvedScope).toBe("USER");
    expect(displayModeSetting?.resolvedVersion).toBe(8);
  });

  it("maps user version and resolved value for helpTextPreviewSize", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "helpTextPreviewSize",
        scopeType: "USER",
        scopeId: "1",
        valueJson: "large",
        version: 7,
        updatedAt: new Date("2026-03-03T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const helpTextPreviewSize = result.find((entry) => entry.key === "helpTextPreviewSize");

    expect(helpTextPreviewSize).toBeDefined();
    expect(helpTextPreviewSize?.userVersion).toBe(7);
    expect(helpTextPreviewSize?.resolvedValue).toBe("large");
    expect(helpTextPreviewSize?.resolvedScope).toBe("USER");
    expect(helpTextPreviewSize?.resolvedVersion).toBe(7);
  });

  it("maps user versions and resolved values for entity form shell widths", async () => {
    usersRepoMock.getUserWithRole.mockResolvedValue({
      id: 1,
      isActive: true,
      roleCode: "ADMIN",
    } as any);
    settingsRepoMock.listSettingCandidates.mockResolvedValue([
      {
        settingKey: "entityFormShell.sidebarWidthPx",
        scopeType: "USER",
        scopeId: "1",
        valueJson: 400,
        version: 9,
        updatedAt: new Date("2026-03-22T00:00:00.000Z"),
        updatedBy: 1,
      },
      {
        settingKey: "entityFormShell.contentMaxWidthPx",
        scopeType: "USER",
        scopeId: "1",
        valueJson: 900,
        version: 10,
        updatedAt: new Date("2026-03-22T00:00:00.000Z"),
        updatedBy: 1,
      },
    ] as any);

    const result = await getResolvedSettingsForUser(1);
    const sidebarWidth = result.find((entry) => entry.key === "entityFormShell.sidebarWidthPx");
    const contentMaxWidth = result.find((entry) => entry.key === "entityFormShell.contentMaxWidthPx");

    expect(sidebarWidth).toBeDefined();
    expect(sidebarWidth?.userVersion).toBe(9);
    expect(sidebarWidth?.resolvedValue).toBe(400);
    expect(sidebarWidth?.resolvedScope).toBe("USER");
    expect(sidebarWidth?.resolvedVersion).toBe(9);

    expect(contentMaxWidth).toBeDefined();
    expect(contentMaxWidth?.userVersion).toBe(10);
    expect(contentMaxWidth?.resolvedValue).toBe(900);
    expect(contentMaxWidth?.resolvedScope).toBe("USER");
    expect(contentMaxWidth?.resolvedVersion).toBe(10);
  });
});
