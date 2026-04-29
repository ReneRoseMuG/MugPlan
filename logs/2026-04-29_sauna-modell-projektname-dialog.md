# Log: Sauna-Modell-Projektnamen-Dialog

## Anlass

Im Projektformular sollte bei einer Änderung des Artikellisten-Dropdowns `Sauna` erkannt werden, dass sich das Sauna-Modell geändert hat. Das System soll in diesem Fall fragen, ob der Projektname auf das ausgewählte Sauna-Modell gesetzt werden soll.

Die bestehende Rollen-Kompromisslösung blieb unverändert:
- `Admin` und `Disponent` dürfen im Formular schreiben.
- `Leser` bleibt über die bestehende UI-seitige Sperre ausgeschlossen.

## Umgesetzte Änderung

Die Behandlung wurde direkt im bestehenden Auswahl-Handler des Projektformulars ergänzt.

Verhalten:
- Wird im Feld `Sauna` ein anderes Modell ausgewählt, prüft das Formular, ob sich die Auswahl fachlich wirklich geändert hat.
- Wenn sich das Modell geändert hat und der aktuelle Projektname nicht bereits dem neuen Modellnamen entspricht, erscheint die Rückfrage:
  `Sauna-Modell geändert, soll ich den Namen des Projekts anpassen?`
- Bei Bestätigung wird `Projektname` auf den Namen des ausgewählten Sauna-Modells gesetzt.
- Bei Ablehnung bleibt der bisherige Projektname unverändert.
- Bei erneutem Auswählen desselben Sauna-Modells erscheint keine Rückfrage.

## Betroffene Dateien

- `client/src/components/ProjectForm.tsx`
- `tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts`
- `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`

## Testanpassungen

Die vorhandenen Browser-Tests wurden an den neuen Dialog angepasst.

Zusätzlich wurden zwei gezielte Fälle abgesichert:
- Bestätigung der Rückfrage übernimmt den Projektnamen.
- Ablehnung der Rückfrage belässt den Projektnamen unverändert.

Ein bestehender FT02-Browsertest musste nachgeschärft werden, weil dort im Edit-Fall dieselbe Sauna-Auswahl nochmals gesetzt wurde. Für diesen Fall darf kein Dialog erscheinen; der Test wurde entsprechend korrigiert.

## Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts --grep "shows an extracted document only as project attachment after successful project save"`

## Ergebnis

Die gewünschte Komfortfunktion ist umgesetzt.
Die bestehende Rollenbehandlung wurde bewusst nicht verändert.
Die gezielt betroffenen Typecheck- und Browser-Verifikationen laufen grün.
