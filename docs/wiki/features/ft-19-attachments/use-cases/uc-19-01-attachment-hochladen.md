# UC 19/01: Attachment hochladen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent

## Ziel

Eine Datei einem bestehenden Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) hinzufügen.

## Vorbedingungen

- Das Parent-Objekt existiert persistent.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte für das Parent-Objekt.
- Die Detailansicht des Parent-Objekts ist geöffnet.
- Die maximal zulässige DateigröÃŸe ist systemseitig definiert.

## Ablauf

1. Der Akteur wählt in der Detailansicht des Parent-Objekts die Funktion „Attachment hinzufügen“.
2. Das System öffnet einen Dateiauswahldialog.
3. Der Akteur wählt eine lokale Datei aus.
4. Das System überträgt die Datei per Multipart-Request an den Server.
5. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung des Akteurs,
    - Existenz des Parent-Objekts,
    - DateigröÃŸe,
    - grundlegende Dateieigenschaften.
6. Das System generiert einen eindeutigen persistenten Speichername.
7. Das System speichert die Datei im definierten Upload-Verzeichnis.
8. Das System legt einen Attachment-Datensatz mit Parent-Referenz an.
9. Das System speichert Metadaten (Originaldateiname, persistenter Speichername, MIME-Typ, DateigröÃŸe, Erstellungszeitpunkt).
10. Das System aktualisiert die Attachmentliste in der UI.

**Alternativabläufe**

- Der Akteur bricht den Upload vor Bestätigung ab → Es wird kein Attachment gespeichert.
- Das Parent-Objekt existiert nicht → System antwortet mit 404.
- Der Akteur besitzt keine Ã„nderungsrechte → System blockiert mit 403.
- Die Datei überschreitet das GröÃŸenlimit oder ist ungültig → System antwortet mit 400, speichert nichts.
- Technischer Fehler bei Speicherung → System antwortet mit 500, speichert nichts.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Datei ist persistent gespeichert.
- Ein Attachment-Datensatz mit korrekter Parent-Referenz existiert.
- Die Attachmentliste zeigt das neue Attachment konsistent an.

