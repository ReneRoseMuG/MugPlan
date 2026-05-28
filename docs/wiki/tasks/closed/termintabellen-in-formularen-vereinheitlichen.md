# Termintabellen in Formularen vereinheitlichen

Die offene Decision zu Terminlisten in Formular- und Detailansichten soll als Aufgabe geführt werden. Ziel ist eine fachlich und UX-seitig bewusste Entscheidung, ob Kunden- und Projektformulare stärker an die Terminlistenmuster von Touren und Mitarbeitern angeglichen werden sollen.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Mittel | Formularansichten | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe sollte eine klare Umsetzungsentscheidung für Termintabellen in Formularen vorbereiten und die bestätigte Variante anschließend technisch umsetzen.

## Ausgangslage

W-11 beschreibt unterschiedliche Termin-Darstellungen in Kunden-, Projekt-, Tour- und Mitarbeiterformularen. Dadurch entstehen Sonderpfade für Darstellung, Navigation, Vorschau und Tests.

## Umfang

- Bestehende Terminlistenvarianten in Formularen fachlich vergleichen.
- Auswirkungen auf UX, Navigation, Fokuswege und Tests dokumentieren.
- Prüfen, welche Variante ohne fachliche Rollen- oder API-Änderung umsetzbar wäre.
- Nicht Teil der Aufgabe ist eine direkte UI-Umgestaltung ohne bestätigte Variante.

## Umsetzungshinweise

- Rollen, Berechtigungen und serverseitige Terminlogik sollen unverändert bleiben.
- Der spätere Eingriff liegt voraussichtlich in Informationsarchitektur, Layout und Frontend-Verkabelung.
- Browser-Tests müssen geänderte Öffnungswege, Fokusführung und Terminlistenverhalten abdecken.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 28.05.26
- Ergebnis: Variante C wurde umgesetzt. `AppointmentsListPage` unterstützt neben `standalone`, `tour` und `employee` nun auch die Formkontexte `customer` und `project`. Kunden- und Projektformulare zeigen im Edit-Modus einen Haupttab `Termine`, der die gemeinsame Terminliste mit festem Entity-Kontext verwendet. Die bestehenden kompakten Sidebar-Terminpanels bleiben als Zusammenfassung erhalten.
- Rollen: Es wurden keine neuen Mutationsrechte, Endpunkte oder Rollenfreigaben eingeführt. `ADMIN`, `DISPATCHER`/`DISPONENT` und `READER`/`LESER` nutzen weiter die bestehende serverseitig abgesicherte Terminlisten- und Terminformularlogik.
- Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/appointmentsListPage.tourLocking.smoke.test.tsx tests/unit/ui/appointmentsListPage.controlled-state.test.tsx tests/unit/ui/customerData.layoutShellIntegration.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`; `npm run test:integration -- tests/integration/server/appointments.direct-projections.integration.test.ts tests/integration/server/appointments.entity-card-payload.integration.test.ts`; `npm run test:e2e:browser -- tests/e2e-browser/project-sidebar-all-appointments.browser.e2e.spec.ts`; `npm run check`; `git diff --check`.

---

## Beziehungen

- Features: Formular- und Detailansichten für Kunden, Projekte, Touren und Mitarbeiter
- Entscheidungen: [W-11 - Termintabellen in Formularen vereinheitlichen](../decisions/w-11-termintabellen-in-formularen.md)
