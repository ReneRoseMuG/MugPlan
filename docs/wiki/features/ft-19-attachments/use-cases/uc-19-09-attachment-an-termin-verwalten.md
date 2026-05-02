# UC 19/09: Attachment an Termin verwalten

## Metadaten

- Feature: [FT (19): Attachments](../feature.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine Datei einem bestehenden Termin als Attachment hinzufügen, die Anhangsliste anzeigen und Attachments herunterladen. Termin-Attachments folgen denselben technischen Regeln wie Attachments anderer Domänen, haben aber eine termineigene Besonderheit: Sie bleiben am Termin erhalten, unabhängig von Änderungen an Mitarbeiterliste, Tourzuordnung oder Datum.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Für Upload: Der Akteur besitzt die Rolle Disponent oder Administrator.
- Für Anzeige/Download: Der Akteur besitzt mindestens Leserechte.

**Ablauf — Upload**

1. Der Akteur öffnet die Detailansicht eines Termins.
2. Der Akteur wählt die Funktion „Attachment hinzufügen".
3. Das System prüft serverseitig Authentifizierung, Berechtigung (Disponent oder Administrator) und Existenz des Termins.
4. Das System führt den Upload-Prozess gemäß UC 19/01 und UC 19/05 durch.
5. Das System legt einen Attachment-Datensatz mit Referenz auf den Termin an.
6. Das System aktualisiert die Attachmentliste in der Termindetailansicht.

**Ablauf — Anzeige und Download**

1. Der Akteur öffnet die Termindetailansicht.
2. Das System lädt alle dem Termin zugeordneten Attachments.
3. Der Akteur öffnet oder lädt ein Attachment gemäß UC 19/03 und UC 19/04.

**Besonderheit Termin-Attachments**

- Termin-Attachments bleiben beim Termin, wenn Mitarbeiter zugewiesen oder entfernt werden.
- Termin-Attachments bleiben beim Termin, wenn die Tourzuordnung geändert oder entfernt wird.
- Termin-Attachments bleiben beim Termin, wenn das Datum verschoben wird.
- Termin-Attachments werden erst entfernt, wenn der Termin selbst gelöscht wird (CASCADE).
- Historische Termine sind read-only — Uploads auf historische Termine werden serverseitig blockiert (403).

**Alternativabläufe**

- Termin existiert nicht → System antwortet mit 404.
- Akteur ohne Berechtigung → System blockiert mit 403.
- Termin ist historisch (Startdatum in der Vergangenheit) → Upload wird blockiert, Anzeige und Download bleiben erlaubt.
- Datei ungültig oder zu groß → System antwortet mit 400, speichert nichts.
- Technischer Fehler → System antwortet mit 500.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Attachment ist persistent gespeichert und eindeutig dem Termin zugeordnet.
- Die Attachmentliste des Termins ist konsistent.
- Termin-Attachments überleben alle Änderungen am Termin außer der Termerlöschung selbst.
- Historische Termine können nicht mit neuen Attachments versehen werden.
