# Kunden-Dialoge

Dialog-, Bestätigungs- und Meldungspfade für Kundenansichten, Kundenlisten, Kundenanhänge und Termine im Kundenkontext sind im P-01-Rollout vereinheitlicht. Der Abschluss konzentriert sich auf Kundenformular, Kundennotizen, Rollenprüfung, normalisierte Meldungen und die bestehende Kunden-Readonly-Sicht.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Kundenansichten, Kundenlisten, Kundenanhänge und Termine im Kundenkontext einheitlich strukturieren.

## Ausgangslage

Der Kundenbereich nutzte bereits serverseitige Rollenfilter und Readonly-Wiring, zeigte Mutationsfehler im Kundenformular aber primär als Toast. Kundennotiz-Löschungen liefen über den generischen Notizbereich und waren daher von der zentralen Notiz-Dialogstruktur abhängig.

## Umfang

- Das Kundenformular zeigt normalisierte Mutationsfehler zusätzlich inline im Formularbereich.
- Kundennotiz-Löschungen laufen über den gemeinsamen Notiz-Bestätigungsdialog statt über einen nativen Browser-Confirm-Pfad.
- Kunden-Tag-, Kundenstamm- und Kundennotiz-Mutationen behalten bestehende Query-Invalidierungen bei.
- `ADMIN` und `DISPONENT` dürfen Kunden bearbeiten, Kundentags und Kundennotizen verwalten sowie Kundenanhänge löschen, soweit die bestehenden Serverregeln dies erlauben.
- `LESER` sieht Kunden readonly und löst keine Kundenmutation in der UI aus; direkte unzulässige API-Mutationen bleiben serverseitig gesperrt.
- Nicht Teil der Aufgabe sind neue Kunden-Contracts, Schemaänderungen, neue Attachment-Architektur oder eine fachliche Änderung der Kunden-Sichtbarkeitsregeln.

## Umsetzungshinweise

- Betroffene UI-Dateien: `client/src/components/CustomerData.tsx`, `client/src/components/NotesSection.tsx`.
- Betroffene Tests: `tests/unit/ui/customerData.layoutShellIntegration.test.tsx`, `tests/unit/ui/customersPage.controlled-state.test.tsx`, `tests/unit/ui/customersPage.readerReadonly.smoke.test.tsx`, `tests/integration/server/customers.paged-list.integration.test.ts`, `tests/integration/server/customers.visibility.by-role.test.ts`, `tests/integration/server/appointments.customer.sidebar-vs-all.integration.test.ts`, `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`, `tests/e2e-browser/customer-tags.persistence.browser.e2e.spec.ts`.
- Die serverseitige Kunden-Sichtbarkeit bleibt maßgeblich; UI-Readonly ist nur Bedienführung.
- Es wurden keine neuen Endpunkte, Contracts oder Datenbankmigrationen eingeführt.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 10.05.26
- Ergebnis: Kundenformular und Kundennotizen nutzen gemeinsame Dialog- und Inline-Fehlerstrukturen, ohne die bestehenden Kundenrollen oder Datenflüsse auszuweiten.
- Automatisierte Verifikation: Typecheck, gezielte Kunden-Unit-Tests, Kunden-/Termin-Integrationstests, Kunden-Browser-E2E, Encoding-Check und Diff-Prüfung erfolgreich.
- App-Prüfung: Automatisierte Browserprüfung für Kunden-Readonly und Kunden-Tags bestanden; manuelle Nutzerprüfung steht noch aus.
- Verwendete Testdaten: synthetische Kunden, Tags, Termine und Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Fixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 mit 0 Fehlern ausgeführt.
- Verbleibende Lücken: Ein zusätzlicher breit gestarteter Projekt-Browserlauf brach in einem bestehenden Produktdialog-Test ab; der Kundenpfad war davon nicht betroffen.
- Folgeaufgaben: Keine für diesen P-01-Schritt.

---

## Beziehungen

- Features: [FT-09 - Kundenverwaltung](../../features/ft-09-kundenverwaltung/ft-09-kundenverwaltung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [10.05.26 - P01: Kunden-, Mitarbeiter- und Notizen-Dialoge abgeschlossen](../../journal/10-05-26-p01-kunden-mitarbeiter-notizen-dialoge-abgeschlossen.md)
