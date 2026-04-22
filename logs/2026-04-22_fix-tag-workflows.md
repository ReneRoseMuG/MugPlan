# Fix Tag Workflows

## Zweck

Korrektur der dokumentierten Tag-Workflows für `Reklamation` und `Messe Aufbau/Abbau` sowie Stabilisierung der UI-Abschlüsse bei langsam nachlaufenden Server-Refetches.

## Scope

- Projekt-Tag-Workflow an die bestehende Tag-Rule-Engine angebunden
- Notizvorschlag im Projektformular für `Reklamation` und `Messe Aufbau/Abbau` ergänzt
- Wochenkarten-Tag-Picker schließt nach erfolgreicher Persistenz unabhängig von nachgelagerten Refetches
- Wochenkarten-Notizeditor schließt nach erfolgreichem Speichern unabhängig von nachgelagerten Refetches
- Keine API-, Schema-, Rollen- oder Persistenzänderungen

## Technische Änderungen

- `client/src/hooks/useTagRuleEngine.ts`
  - `computeTagAddedAction` ist nicht mehr hart an eine Termin-ID gebunden.
  - Die Regel bleibt auf die dokumentierten Tags `Reklamation` und `Messe Aufbau/Abbau` begrenzt.

- `client/src/components/ProjectForm.tsx`
  - Notizvorlagen werden geladen.
  - Projekt-Tags lösen nach erfolgreichem Add denselben Notizvorschlag aus wie Termin-Tags.
  - Bestätigen erzeugt eine Projektnotiz aus der passenden Vorlage.
  - Draft-Projektkontext wird ebenfalls unterstützt.

- `client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx`
  - Der Picker schließt direkt nach erfolgreichem Tag-POST.
  - Der Notizeditor schließt direkt nach erfolgreichem Notiz-Update.
  - Nachgelagerte Invalidierungen laufen weiterhin, blockieren aber den sichtbaren UI-Abschluss nicht mehr.

## Tests

Ausgeführt:

- `npm run test:unit -- tests/unit/hooks/useTagRuleEngine.test.ts`
- `npx tsc --noEmit`
- `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`
- `npm run lint`

Ergebnis:

- Alle ausgeführten Prüfungen erfolgreich.

## Neue und angepasste Absicherung

- Projektformular: `Reklamation`-Tag öffnet Notizfrage und erstellt eine Projektnotiz aus der Vorlage.
- Wochenkarten-Picker: künstlich verzögerter Kalender-Refetch verhindert das Schließen des Pickers nicht.
- Wochenkarten-Notizeditor: künstlich verzögerter Notiz-Refetch verhindert das Schließen des Editors nicht.
- Rule-Engine-Unit-Test: projekt- und draftfähiges Verhalten ohne Termin-ID abgesichert.

## Bekannte Einschränkungen

- Der volle Testlauf wurde nicht ausgeführt.
- Die gezielte Browser-Suite deckt die betroffenen FT06-Workflow- und Latenzfälle ab.
