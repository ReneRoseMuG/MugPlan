# 04.05.26 | UI-Nacharbeit | FT-04: Tour-KW-View Layout vereinfachen

## Zusammenfassung

Der neue Tour-KW-View wurde nach der ersten Umsetzung visuell reduziert. Redundante Datumsinformationen in den Karten wurden im Kontext dieses Views entfernt, die separate Tour-Spalte entfällt, und Touren erscheinen nun als horizontale Header-Bars wie im Wochenkalender.

## Art der Änderung

Frontend-UI-Nacharbeit in bestehender Struktur. Es wurden keine Backend-Contracts, Datenmodelle, Rollenregeln oder Persistenzpfade geändert.

## Betroffene Features

- FT (04): Tourenplanung  
  Notion: https://www.notion.so/746286ccf41d46629ec614541a871345
- Aufgabe: KW Tourenplanung View  
  Notion: https://www.notion.so/351da094354e80da810ee12b9f9f53bf

## Konkrete Änderungen

- Die Von-bis-Datumsangabe wird in Tour-KW-Karten des neuen Views ausgeblendet.
- Die Tour-Spalte wurde entfernt.
- Jede Tour-Gruppe erhält eine horizontale Header-Bar über alle vier KW-Spalten.
- Die Header-Bar nutzt das bestehende Wochenkalender-Muster `CalendarWeekTourLaneHeaderBar`.
- Der Notizen-Toggle wurde rechts in die Tab-Zeile der Tourenverwaltung verschoben.
- Die Inline-Notizen-Einstellung bleibt technisch unverändert und wird weiterhin über `calendar.weekInlineNotes.visible` gespeichert.

## Tests / Verifikation

- `npm run check`
- `npm run test:unit -- tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/ui/tourManagement.role-readonly.smoke.test.tsx tests/unit/ui/tourManagement.versioning.test.tsx`

Beide Prüfläufe waren erfolgreich.

## Offene Punkte

- Kein zusätzlicher Browser-E2E-Lauf in dieser Nacharbeit.
- Weitere optische Feinabstimmungen am neuen View sind nicht ausgeschlossen, waren aber nicht Teil dieses Auftrags.
