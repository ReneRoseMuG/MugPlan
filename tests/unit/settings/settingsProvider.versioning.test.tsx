/**
 * Test Scope:
 *
 * Feature: FT08 - User-Settings Versionierung
 * Use Case: UC Settings speichern mit Optimistic Locking
 *
 * Abgedeckte Regeln:
 * - Scope-Version wird nur aus vorhandenen persisted Versionen aufgeloest.
 * - Fehlende Scope-Version erzeugt keinen stillen Fallback.
 * - VERSION_CONFLICT fuehrt zu genau einem Retry mit refetchter Version.
 *
 * Fehlerfaelle:
 * - Fehlende Initialversion blockiert den Schreibversuch.
 * - Nicht-Konfliktfehler duerfen keinen Retry triggern.
 *
 * Ziel:
 * Sicherstellen, dass Settings-Updates nie ohne valide aktuelle Version geschrieben werden.
 */
import { describe, expect, it, vi } from "vitest";
import type { UserSettingsResolvedResponse } from "@shared/routes";
import {
  isVersionConflictError,
  resolveSettingVersion,
  setSettingWithVersionRetry,
} from "../../../client/src/providers/SettingsProvider";

describe("PKG-08 SettingsProvider versioning", () => {
  it("resolves version by selected scope", () => {
    const settings: UserSettingsResolvedResponse = [
      {
        key: "projects.viewMode",
        label: "Projekte Ansicht",
        description: "desc",
        type: "enum",
        constraints: { options: ["board", "table"] },
        allowedScopes: ["USER"],
        defaultValue: "board",
        userValue: "table",
        userVersion: 7,
        resolvedValue: "table",
        resolvedVersion: 7,
        resolvedScope: "USER",
        roleCode: "ADMIN",
        roleKey: "ADMIN",
      },
      {
        key: "attachmentStoragePath",
        label: "Attachment Speicherpfad",
        description: "desc",
        type: "string",
        constraints: {},
        allowedScopes: ["GLOBAL"],
        defaultValue: "server/uploads",
        globalValue: "server/uploads",
        globalVersion: 3,
        resolvedValue: "server/uploads",
        resolvedVersion: 3,
        resolvedScope: "GLOBAL",
        roleCode: "ADMIN",
        roleKey: "ADMIN",
      },
    ];

    expect(resolveSettingVersion(settings, { key: "projects.viewMode", scopeType: "USER" })).toBe(7);
    expect(resolveSettingVersion(settings, { key: "attachmentStoragePath", scopeType: "GLOBAL" })).toBe(3);
  });

  it("returns null when no persisted scope value exists", () => {
    const settings: UserSettingsResolvedResponse = [
      {
        key: "customers.viewMode",
        label: "Kunden Ansicht",
        description: "desc",
        type: "enum",
        constraints: { options: ["board", "table"] },
        allowedScopes: ["USER"],
        defaultValue: "board",
        resolvedValue: "board",
        resolvedScope: "DEFAULT",
        roleCode: "ADMIN",
        roleKey: "ADMIN",
      },
    ];

    expect(resolveSettingVersion(settings, { key: "customers.viewMode", scopeType: "USER" })).toBeNull();
    expect(resolveSettingVersion(settings, { key: "unknown", scopeType: "USER" })).toBeNull();
  });

  it("retries once after VERSION_CONFLICT using refreshed version", async () => {
    const conflict = new Error('409: {"code":"VERSION_CONFLICT"}');
    const mutate = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(undefined);
    const refetchSettings = vi.fn().mockResolvedValue([
      {
        key: "projects.viewMode",
        label: "Projekte Ansicht",
        description: "desc",
        type: "enum",
        constraints: { options: ["board", "table"] },
        allowedScopes: ["USER"],
        defaultValue: "board",
        userValue: "board",
        userVersion: 2,
        resolvedValue: "board",
        resolvedVersion: 2,
        resolvedScope: "USER",
        roleCode: "ADMIN",
        roleKey: "ADMIN",
      },
    ] satisfies UserSettingsResolvedResponse);

    await setSettingWithVersionRetry({
      input: { key: "projects.viewMode", scopeType: "USER", value: "table" },
      currentSettings: [
        {
          key: "projects.viewMode",
          label: "Projekte Ansicht",
          description: "desc",
          type: "enum",
          constraints: { options: ["board", "table"] },
          allowedScopes: ["USER"],
          defaultValue: "board",
          userValue: "board",
          userVersion: 1,
          resolvedValue: "board",
          resolvedVersion: 1,
          resolvedScope: "USER",
          roleCode: "ADMIN",
          roleKey: "ADMIN",
        },
      ],
      mutate,
      refetchSettings,
    });

    expect(mutate).toHaveBeenNthCalledWith(1, {
      key: "projects.viewMode",
      scopeType: "USER",
      value: "table",
      version: 1,
    });
    expect(refetchSettings).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenNthCalledWith(2, {
      key: "projects.viewMode",
      scopeType: "USER",
      value: "table",
      version: 2,
    });
  });

  it("does not send fallback version when current scope version is missing", async () => {
    const mutate = vi.fn();

    await expect(
      setSettingWithVersionRetry({
        input: { key: "customers.viewMode", scopeType: "USER", value: "table" },
        currentSettings: [
          {
            key: "customers.viewMode",
            label: "Kunden Ansicht",
            description: "desc",
            type: "enum",
            constraints: { options: ["board", "table"] },
            allowedScopes: ["USER"],
            defaultValue: "board",
            resolvedValue: "board",
            resolvedScope: "DEFAULT",
            roleCode: "ADMIN",
            roleKey: "ADMIN",
          },
        ],
        mutate,
        refetchSettings: vi.fn().mockResolvedValue([]),
      }),
    ).rejects.toThrow("VALIDATION_ERROR: missing current version");

    expect(mutate).not.toHaveBeenCalled();
  });

  it("detects VERSION_CONFLICT from error message", () => {
    expect(isVersionConflictError(new Error('409: {"code":"VERSION_CONFLICT"}'))).toBe(true);
    expect(isVersionConflictError(new Error("500: Internal Server Error"))).toBe(false);
  });
});
