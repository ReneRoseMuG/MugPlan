# Tour-KW- und Termin-Mutationsdialoge

Einheitlicher Verschiebe-Dialog für Formular, Drag & Drop, Mark & Insert und Tour-Wechsel, Tour-KW-Multistep-Dialog sowie backward-kompatible Preview-Contract-Erweiterung. Die Aufgabe baut auf Fehler-Normalisierung und Dialog-Basiskomponenten auf. Die offenen Entscheidungen aus Dialog-Rollout-Masterplan müssen vor Umsetzung geklärt sein. Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Einheitlicher Verschiebe-Dialog für Formular, Drag & Drop, Mark & Insert und Tour-Wechsel, Tour-KW-Multistep-Dialog sowie backward-kompatible Preview-Contract-Erweiterung. Die Aufgabe baut auf Fehler-Normalisierung und Dialog-Basiskomponenten auf. Die offenen Entscheidungen aus Dialog-Rollout-Masterplan müssen vor Umsetzung geklärt sein.

## Ausgangslage

Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

## Umfang

- Der konkrete Umfang ist noch zu konkretisieren.

## Umsetzungshinweise

- Die Umsetzungshinweise sind noch zu konkretisieren.

## Blocker und offene Fragen

Keine bekannt.

---

## Abschluss 11.05.26

Die Aufgabe ist umgesetzt. Tour-KW- und Terminressourcen laufen über einen gemeinsamen Dialograhmen. Der Termin-Tourwechsel-Preview deckt jetzt auch reine Datums- und Zeitverschiebungen im gleichen Tour-/KW-Kontext ab und zeigt aktuelle Mitarbeiterkonflikte vor dem Speichern. Kalenderbewegungen verwenden denselben Preview- und Entscheidungsfluss, statt eigene Bestätigungslogik zu behalten.

Die serverseitige Previewlogik prüft aktuelle Terminmitarbeiter erneut gegen Überschneidungen im Zielzeitraum. Finale Mutationen werden weiterhin über bestehende Endpunkte und serverseitige Validierungen ausgeführt; es wurde keine DB-Migration eingeführt.

### Verifikation

- `npm run check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- gezielte Browser-E2E für Terminformular, Kalender-Drag-&-Drop, Wochenkalender und Reader-Readonly
- `git diff --check`

## Beziehungen

- Features: [FT-01 - Kalendertermine](../../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Journal: [P01 Ressourcenplanung-Dialoge abgeschlossen](../../journal/11-05-26-p01-ressourcenplanung-dialoge-abgeschlossen.md)
- Weitere Bezüge: [Dialog-Rollout-Masterplan](../dialog-rollout-masterplan.md) · [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](termin-tour-kw-mutationsdialoge.md) · [FT-04 Multiselect KW-Planung Wochenkalender](ft04-multiselect-kw-planung-wochenkalender.md) · [Mitarbeiter-Auswahl-Dialogstruktur](mitarbeiter-auswahl-dialogstruktur.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
