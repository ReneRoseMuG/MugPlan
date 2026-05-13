# Dialog-Basiskomponenten

Dialog-Shell, Confirm-Variante, Mutation-Preview-Variante, Stepper/Statuszeile, feste Footer-Actions, Loading/Error-Bereich und Inline-Message-Baustein stehen bereit. Die Aufgabe baut auf Fehler-Normalisierung auf und wurde mit dem ersten echten Domain-Dialog erfolgreich bestätigt.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-Shell, Confirm-Variante, Mutation-Preview-Variante, Stepper/Statuszeile, feste Footer-Actions, Loading/Error-Bereich und Inline-Message-Baustein bereitstellen. Die Aufgabe enthält Unit-Tests, baut auf Fehler-Normalisierung auf und ist Voraussetzung für Tour-KW- und Termin-Mutationsdialoge sowie alle Domain-Objekt-Tasks.

## Ausgangslage

Bestehende Dialoge nutzten lokale Strukturen und unterschiedliche Footer-, Fehler- und Bestätigungsmuster. Für den Dialog-Rollout wurden wiederverwendbare Bausteine benötigt, die spätere Domain-Dialoge ohne eigene Sonderlogik aufnehmen können.

## Umfang

- Die zentralen Bausteine liegen in `client/src/components/ui/dialog-base.tsx`.
- Enthalten sind Dialog-Shell, feste Footer-Actions, Inline-Message, Stepper, Confirm-Dialog und Mutation-Preview-Dialog.
- Der Basisdialog stellt eine erkennbare Struktur aus Header mit Domänen-Icon, Body und Footer bereit.
- Loading- und Pending-Zustände sind für Footer-Actions und Confirm-Aktionen vorbereitet.
- Nicht Teil der Aufgabe ist die Migration aller bestehenden Domain-Dialoge auf diese Bausteine.

## Umsetzungshinweise

- Die Unit-Tests liegen in `tests/unit/ui/dialogBaseComponents.test.tsx`.
- Die Tests decken Footer-Actions, normalisierte Fehleranzeige, Stepper-Markierung und die strukturierte Header-/Body-/Footer-Semantik ab.
- Ergänzend liefen die bestehenden UI-Sicherungen für Layout-Surfaces und SpinField-Grenzen aus der P01-Testsuite.
- Rollenbezug: Die Aufgabe ändert keine Sichtbarkeit, keine Aktion und keinen Endpunkt; spätere Dialoge müssen ihre bestehenden serverseitigen Berechtigungen unverändert durchsetzen.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Die Dialog-Basiskomponenten sind umgesetzt und mit dem Team-Dialog als erstem Domain-Piloten in der App bestätigt.
- Automatisierte Verifikation: `tests/unit/ui/dialogBaseComponents.test.tsx` sowie die Team-UI-Suite aus der ersten P01-Domain-Umsetzung.
- App-Prüfung: Die Prüfung des Team-Dialogs hat Header mit Domänen-Icon, Body und Footer als erkennbare Dialogstruktur bestätigt.
- Verwendete Testdaten: synthetische Dialogprops, normalisierte Fehlerobjekte und FT-11-Teamfixtures aus der Team-UI-Suite.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern.
- Verbleibende Lücken: Keine für diese Grundlagenaufgabe; weitere Domain-Dialoge müssen die Basisstruktur jeweils gezielt übernehmen und testen.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](../ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](../ft04-multistep-tour-kw-dialog.md) · [Fehler-Normalisierung](fehler-normalisierung.md)
- Journal: [09.05.26 - P01: Dialog-Basiskomponenten abgeschlossen](../../journal/09-05-26-p01-dialog-basiskomponenten-abgeschlossen.md)
