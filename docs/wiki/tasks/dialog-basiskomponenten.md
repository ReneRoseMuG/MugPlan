# Dialog-Basiskomponenten

Dialog-Shell, Confirm-Variante, Mutation-Preview-Variante, Stepper/Statuszeile, feste Footer-Actions, Loading/Error-Bereich und Inline-Message-Baustein bereitstellen. Die Aufgabe enthält Unit-Tests, baut auf Fehler-Normalisierung auf und ist Voraussetzung für Tour-KW- und Termin-Mutationsdialoge sowie alle Domain-Objekt-Tasks. Die technische Grundlage ist umgesetzt und wartet auf die erste manuelle Prüfung in einem angebundenen Domain-Dialog.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `in Bearbeitung` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-Shell, Confirm-Variante, Mutation-Preview-Variante, Stepper/Statuszeile, feste Footer-Actions, Loading/Error-Bereich und Inline-Message-Baustein bereitstellen. Die Aufgabe enthält Unit-Tests, baut auf Fehler-Normalisierung auf und ist Voraussetzung für Tour-KW- und Termin-Mutationsdialoge sowie alle Domain-Objekt-Tasks.

## Ausgangslage

Bestehende Dialoge nutzen lokale Strukturen und unterschiedliche Footer-, Fehler- und Bestätigungsmuster. Für den Dialog-Rollout braucht es wiederverwendbare Bausteine, die spätere Domain-Dialoge ohne eigene Sonderlogik aufnehmen können.

## Umfang

- Die zentralen Bausteine liegen in `client/src/components/ui/dialog-base.tsx`.
- Enthalten sind Dialog-Shell, feste Footer-Actions, Inline-Message, Stepper, Confirm-Dialog und Mutation-Preview-Dialog.
- Loading- und Pending-Zustände sind für Footer-Actions und Confirm-Aktionen vorbereitet.
- Nicht Teil der Aufgabe ist die Migration bestehender Domain-Dialoge auf diese Bausteine.

## Umsetzungshinweise

- Die Unit-Tests liegen in `tests/unit/ui/dialogBaseComponents.test.tsx`.
- Die Tests decken Footer-Actions, normalisierte Fehleranzeige und Stepper-Markierung ab.
- Ergänzend liefen die bestehenden UI-Sicherungen für Layout-Surfaces und SpinField-Grenzen aus der P01-Testsuite.
- Rollenbezug: Die Aufgabe ändert keine Sichtbarkeit, keine Aktion und keinen Endpunkt; spätere Dialoge müssen ihre bestehenden serverseitigen Berechtigungen unverändert durchsetzen.

## Blocker und offene Fragen

- Die manuelle App-Prüfung steht noch aus, weil noch kein Domain-Dialog auf die neuen Basiskomponenten umgestellt wurde.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [Fehler-Normalisierung](fehler-normalisierung.md)
