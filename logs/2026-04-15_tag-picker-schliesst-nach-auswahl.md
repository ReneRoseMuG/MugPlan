# Tag-Picker schließt nach Auswahl

## Zweck

Korrektur des gemeinsamen Tag-Pickers in den Edit-Forms, damit sich das Auswahl-Popover nach der Wahl eines Tags sofort wieder schließt.

## Scope

- Lokale UI-Korrektur im gemeinsamen `TagPickerPanel`
- Keine Änderung an API, Persistenz, Rollenlogik oder Formularstruktur
- Keine zusätzlichen UI-Redesigns oder fachlichen Verhaltensänderungen

## Technische Entscheidungen

- Das `Popover` im `TagPickerPanel` wird lokal kontrolliert statt unkontrolliert verwendet.
- Die Add-Aktion läuft weiterhin über den bestehenden `onAdd`-Callback, schließt davor aber den Picker explizit.
- Der Eingriff bleibt bewusst auf die gemeinsame Komponente begrenzt, damit alle Edit-Forms mit derselben Nutzung automatisch das korrigierte Verhalten erhalten.

## Betroffene Dateien

- `client/src/components/TagPickerPanel.tsx`
- `logs/2026-04-15_tag-picker-schliesst-nach-auswahl.md`

## Tests

Ausgeführt:

- `npm run test:unit -- tests/unit/ui/tagPickerPanel.behavior.test.tsx`

Ergebnis:

- Das Kommando war erfolgreich.

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Der gezielte Testlauf deckt den betroffenen Tag-Picker-Pfad ab, ersetzt aber keine vollständige Regression über alle Formulare.
