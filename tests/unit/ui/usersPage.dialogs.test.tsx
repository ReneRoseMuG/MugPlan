/**
 * Test Scope:
 *
 * Feature: FT14/FT20/P-01 - Benutzer- und Sicherheitsdialoge
 *
 * Abgedeckte Regeln:
 * - Benutzeranlage und Benutzerbearbeitung nutzen die gemeinsame Dialogbasis.
 * - Der 2FA-Reset nutzt einen kontrollierten Bestätigungsdialog statt Browser-Confirm.
 * - Die Admin-only-Einordnung bleibt im Dialogtext sichtbar, ohne serverseitige Guards zu ersetzen.
 *
 * Fehlerfälle:
 * - Benutzerverwaltungsdialoge fallen auf lokale Radix-Dialoge zurück.
 * - 2FA-Reset wird wieder über `window.confirm` bestätigt.
 * - Der sicherheitsnahe Dialog verschweigt, dass Passwort und Rolle unverändert bleiben.
 *
 * Ziel:
 * Den P-01-Dialog-Rollout der sicherheitsnahen Benutzerverwaltung oberflächlich und regressionssicher absichern.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dialogBaseState = vi.hoisted(() => ({
  confirmDialogCalls: [] as Array<Record<string, unknown>>,
  dialogShellCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({
    contentSlot,
    headerActions,
    title,
  }: {
    contentSlot?: React.ReactNode;
    headerActions?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <section data-testid="list-layout">
      <h1>{title}</h1>
      {headerActions}
      {contentSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} readOnly />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({ children }: { children?: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <tr {...props}>{children}</tr>
  ),
}));

vi.mock("@/components/ui/dialog-base", () => ({
  ConfirmDialogBase: (props: Record<string, unknown>) => {
    dialogBaseState.confirmDialogCalls.push(props);
    return (
      <section data-testid={String(props.testId ?? "")}>
        <h2>{props.title as React.ReactNode}</h2>
        <p>{props.description as React.ReactNode}</p>
        <button type="button">{props.confirmLabel as React.ReactNode}</button>
      </section>
    );
  },
  DialogBaseFooter: ({
    primaryAction,
    secondaryAction,
  }: {
    primaryAction?: { label: React.ReactNode; testId?: string };
    secondaryAction?: { label: React.ReactNode; testId?: string };
  }) => (
    <footer>
      {secondaryAction ? <button type="button">{secondaryAction.label}</button> : null}
      {primaryAction ? <button data-testid={primaryAction.testId} type="button">{primaryAction.label}</button> : null}
    </footer>
  ),
  DialogBaseInlineMessage: ({
    description,
    title,
  }: {
    description?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <aside>
      <strong>{title}</strong>
      <span>{description}</span>
    </aside>
  ),
  DialogBaseShell: (props: Record<string, unknown> & { children?: React.ReactNode; footer?: React.ReactNode }) => {
    dialogBaseState.dialogShellCalls.push(props);
    return (
      <section data-testid={String(props.testId ?? "")}>
        <h2>{props.title as React.ReactNode}</h2>
        <p>{props.description as React.ReactNode}</p>
        {props.children}
        {props.footer}
      </section>
    );
  },
}));

import { UsersPage } from "../../../client/src/components/UsersPage";

describe("P-01 UI: Benutzer- und Sicherheitsdialoge", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    dialogBaseState.confirmDialogCalls.length = 0;
    dialogBaseState.dialogShellCalls.length = 0;
  });

  it("rendert Benutzeranlage, Benutzerbearbeitung und 2FA-Reset über die gemeinsame Dialogbasis", () => {
    const html = renderToStaticMarkup(<UsersPage />);

    expect(html).toContain("users-create-dialog");
    expect(html).toContain("users-edit-dialog");
    expect(html).toContain("users-reset-2fa-confirm");

    expect(dialogBaseState.dialogShellCalls.map((call) => call.testId)).toEqual([
      "users-create-dialog",
      "users-edit-dialog",
    ]);
    expect(dialogBaseState.dialogShellCalls[0]).toMatchObject({
      title: "Neuen Benutzer anlegen",
    });
    expect(String(dialogBaseState.dialogShellCalls[0].description)).toContain("serverseitige Admin-Prüfung");
    expect(dialogBaseState.dialogShellCalls[1]).toMatchObject({
      title: "Benutzer bearbeiten",
    });
    expect(String(dialogBaseState.dialogShellCalls[1].description)).toContain("letzte aktive Admin");

    expect(dialogBaseState.confirmDialogCalls).toHaveLength(1);
    expect(dialogBaseState.confirmDialogCalls[0]).toMatchObject({
      confirmLabel: "2FA zurücksetzen",
      testId: "users-reset-2fa-confirm",
      title: "2FA zurücksetzen?",
    });
    expect(String(dialogBaseState.confirmDialogCalls[0].description)).toContain("Passwort und Rolle bleiben unverändert");
  });

  it("verwendet keinen nativen Browser-Confirm für den 2FA-Reset", () => {
    const source = readFileSync(new URL("../../../client/src/components/UsersPage.tsx", import.meta.url), "utf8");

    expect(source).toContain("ConfirmDialogBase");
    expect(source).not.toContain("window.confirm");
  });
});
