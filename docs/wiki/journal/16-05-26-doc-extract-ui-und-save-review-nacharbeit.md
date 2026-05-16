# 16.05.26 | Implementierung | Doc Extract: UI- und Save-Review-Nacharbeit

## Zusammenfassung

Der Projekt-Doc-Extract-Workflow wurde im Multistep-Dialog textlich und visuell nachgezogen. Mehrere erklärende Infoblöcke wurden entfernt oder gekürzt, die Begriffe rund um die Artikelliste wurden im Extract-Dialog auf „Auftragsinhalt“ umgestellt und der Kundenschritt zeigt den Status zur Kundenauflösung jetzt als kompakten Info-Container oberhalb des Formulars.

Im Anschluss wurde eine Regression im Projekt-Speichern-Review korrigiert: Nach Doc Extract wird die Artikelliste beim späteren Projektspeichern wieder auf nicht ausgewählte Positionen geprüft, und das erkannte Sauna-Modell kann wieder als Vorschlag zum Projektname-Abgleich in den Speichern-Dialog gelangen.

## Art der Änderung

- Lokale UI-Nacharbeit in bestehenden React-Komponenten.
- Korrektur der Übergabe zwischen Doc Extract und Projekt-Speichern-Review.
- Testanpassung für geänderte sichtbare Texte und Statuscontainer.
- Keine DB-Migration, keine neue Abhängigkeit und keine API-Contract-Änderung.

## Betroffene Features

- Projektanlage mit Dokumentextraktion.
- Projektanlage aus einem Termin heraus mit Dokumentextraktion.
- Projekt-Speichern-Review für Artikellistenprüfung und Projektname-Angleichung.
- Kundenschritt im Doc-Extract-Multistep-Dialog.

## Konkrete Änderungen

- Im Projekt-Doc-Extract-Dialog wurde der Block „Kundendaten prüfen“ entfernt.
- Im Projektschritt wurde das Label „Artikelliste“ zu „Erkannter Auftragsinhalt“ geändert.
- Die Erfolgsmeldung „Artikelliste wurde erkannt.“ wurde zu „Auftragsinhalt wurde erkannt.“ geändert.
- Der erklärende Reklamationssatz im Mängelschritt wurde entfernt.
- Im Reklamationsschritt wurde der Infoblock „Reklamationsnotiz“ entfernt; Checkbox und Editor bleiben erhalten.
- In der Abschlussübersicht heißt der Status nun „Auftragsinhalt“ statt „Artikelliste“.
- Im Kundenschritt zeigt ein neuer grüner Info-Container mit Icon an, dass ein Kunde beim Übernehmen neu angelegt wird.
- Ein bestehender Kunde wird im Kundenschritt nun in einem orangefarbenen Info-Container mit Icon oberhalb des Formulars angezeigt.
- Im Projekt-Speichern-Dialog wurde der Artikellisten-Hinweis auf „Artikelliste enthält nicht ausgewählte Positionen“ gekürzt.
- Der Projektname-Infoblock wurde entfernt; die eigentliche Checkbox zur Übernahme des Sauna-Modells bleibt erhalten.
- `ProjectForm` übernimmt aus Doc Extract wieder strukturierte Artikelauswahlen, soweit sie gegen vorhandene Masterdaten auflösbar sind.
- `ProjectForm` und der Terminpfad markieren die Artikellistenentscheidung nach Doc Extract nicht mehr als bereits erledigt, damit der spätere Speichern-Review nicht ausgewählte Positionen wieder meldet.

## Rollen

- Keine Rollenlogik wurde geändert.
- Zulässige Sichtbarkeit und Aktionen bleiben unverändert: Kundenermittlung, Kundenanlage, Projektanlage, Reklamationsnotiz und Speichern laufen weiterhin über die bestehenden UI- und Serverpfade.
- Die Änderungen weichen keine Berechtigungen auf und führen keine neuen Endpunkte oder Mutationen ein.

## Tests / Verifikation

- Safety Gate: `.env.test` vorhanden, `NODE_ENV=test` und `MUGPLAN_MODE=test` über die npm-Testskripte gesetzt.
- `npm run test:unit -- tests/unit/ui/projectDocumentExtractionWorkflowDialog.render.test.tsx tests/unit/ui/projectSaveReviewDialog.render.test.tsx` erfolgreich mit 9 Tests.
- `npm run test:unit -- tests/unit/ui/projectDocumentExtractionWorkflowDialog.render.test.tsx` erfolgreich mit 7 Tests.
- `npm run test:unit -- tests/unit/ui/projectSaveReview.logic.test.ts tests/unit/ui/projectSaveReviewDialog.render.test.tsx tests/unit/ui/projectDocumentExtractionWorkflowDialog.render.test.tsx` erfolgreich mit 15 Tests.
- `npm run typecheck` erfolgreich.
- `git diff --check` erfolgreich.

## Offene Punkte

- Kein vollständiger Browser-E2E-Lauf wurde in dieser Session erneut ausgeführt.
- Lokale Dev-Datenpflege für den Testkunden `163116` wurde mehrfach über das vorhandene Dev-Löschskript ausgeführt; diese Datenbankoperation ist nicht Teil des Git-Commits.
