# Messe-Workflow-Notizeditor bleibt nach Speichern offen

Beim Anlegen eines Termins auf der Messe-Tour wird die vorgeschlagene Vorlagen-Notiz korrekt erstellt. Nach dem Bearbeiten und Speichern des anschließend geöffneten Notizeditors bleibt der Editor jedoch sichtbar; ein weiterer Speicherversuch endet mit einem roten Versionskonflikt, obwohl die Notiz bereits korrekt gespeichert wurde.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Notizen | Fehler | 18.05.26 |

---

## Ziel

Der Messe-Workflow-Notizeditor soll nach erfolgreichem Speichern zuverlässig schließen und die lokale Notizversion aktualisieren. Ein erneuter Speicherklick mit veralteter Version darf durch den normalen Erfolgsfall nicht provoziert werden.

## Ausgangslage

Der Fehler wurde am 18.05.26 live beobachtet: Ein Termin wurde in die Messe-Tour gelegt, der angebotene Notizvorschlag aus der Vorlage wurde angenommen, die Notiz erhielt einen Titel und wurde gespeichert. Die Notiz wurde korrekt angelegt und gespeichert, der Editor blieb jedoch offen. Ein zweiter Speicherversuch erzeugte `409 VERSION_CONFLICT`; im Tageslog ist dazu `PUT /api/notes/631` mit Status `409` belegt.

Die Analyse grenzt den Fehler auf den Frontend-State im Neuer-Termin-Flow ein. Der Notiz-Create läuft über `POST /api/appointments/:id/notes`; danach wird der Vorlageneditor mit der neuen Notiz-ID geöffnet. Der anschließende Update-Erfolg über `PUT /api/notes/:noteId` bricht im Erfolgs-Handler ab, wenn das Formular ursprünglich ohne `appointmentId` geöffnet wurde. Dadurch werden Editor-Schließen und lokale Versionsaktualisierung übersprungen.

## Umfang

- Den Erfolgsfall für den Messe-Workflow-Notizeditor im Neuer-Termin-Flow korrigieren.
- Sicherstellen, dass der Editor nach erfolgreichem Update geschlossen wird.
- Sicherstellen, dass die lokale Notizversion nach erfolgreichem Update nicht auf dem alten Wert stehen bleibt.
- Den bestehenden serverseitigen Versionskonflikt für echte Paralleländerungen beibehalten.
- Nicht Teil der Aufgabe ist eine Änderung der Notiz-API, der Messe-Tag-Automatik oder der fachlichen Notizvorlagenlogik.

## Umsetzungshinweise

- Relevante Frontend-Stelle: `client/src/components/AppointmentForm.tsx`
- Relevanter Create-Pfad: `POST /api/appointments/:appointmentId/notes`
- Relevanter Update-Pfad: `PUT /api/notes/:noteId`
- Serverlog-Beleg: `C:\Users\r.rose\repos\Plan\2026-05-18.log`, Eintrag `PUT /api/notes/631` mit Status `409`
- Der Backend-Optimistic-Locking-Pfad in `server/services/notesService.ts` und `server/repositories/notesRepository.ts` verhält sich fachlich korrekt und soll nicht aufgeweicht werden.
- Rollenbezug: Notizmutationen bleiben für `ADMIN` und `DISPONENT` erlaubt; `LESER` darf Notizen lesen, aber keine Notizmutation ausführen. Die spätere Umsetzung darf keine reine UI-Freigabe als Berechtigung behandeln und keine serverseitigen Rollenprüfungen umgehen.
- Erwartete Tests: gezielter Unit-Test für den Neuer-Termin-Messe-Notizflow, der nach erfolgreichem `PUT /api/notes/:noteId` Editor-Schließen und Versionsaktualisierung prüft; falls möglich ein Browser-E2E, der den zweiten fehlerhaften Speicherklick als Regression absichert.

## Blocker und offene Fragen

- Keine bekannt.

---

## Beziehungen

- Features: FT-01 Kalendertermine · FT-04 Tourenplanung · FT-13 Notizverwaltung
- Logbeleg: `C:\Users\r.rose\repos\Plan\2026-05-18.log`
