# UC 09/07: Kundenanhänge verwalten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Dokumente werden einem Kunden zugeordnet, angezeigt und heruntergeladen, ohne die fachliche Integrität des Kunden oder referenzierender Projekte zu beeinträchtigen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; für Upload zusätzlich Ã„nderungsrechte.
- Die hochzuladende Datei entspricht erlaubten Formaten und GröÃŸenbeschränkungen.

---

## Ablauf – Anhang hochladen

1. Der Akteur öffnet die Kundendetailansicht.
2. Der Akteur startet die Funktion „Anhang hinzufügen“.
3. Der Akteur wählt eine Datei aus.
4. Das System prüft:
    - Authentifizierung,
    - Berechtigung,
    - Dateiformat,
    - DateigröÃŸe.
5. Das System speichert die Datei serverseitig unter persistentem Speichername.
6. Das System legt einen Attachment-Datensatz mit Parent-Referenz auf den Kunden an.
7. Das System speichert Metadaten (Originalname, MIME-Typ, GröÃŸe, Zeitstempel).
8. Das System aktualisiert die Anhangsliste in der UI.

---

## Ablauf – Anhang anzeigen / herunterladen

1. Der Akteur öffnet die Anhangsliste des Kunden.
2. Das System lädt alle dem Kunden zugeordneten Attachments.
3. Der Akteur wählt einen Anhang aus.
4. Das System liefert die Datei über einen gesicherten Download-Endpunkt aus.
5. Je nach Dateityp erfolgt Inline-Anzeige oder Download.

---

## Regeln und Einschränkungen

- Ein Attachment kann nicht ohne Parent-Kunde existieren.
- Attachments sind kundenbezogen und unabhängig von Projekten.
- Eine physische Löschung von Attachments ist systemweit nicht vorgesehen.
- Das Löschen eines Kunden entfernt referenzierte Notizen (CASCADE), jedoch keine physische Dateilöschung ist spezifiziert.
- Mehrere Akteure können parallel Anhänge hochladen; jeder Upload erzeugt einen eigenständigen Attachment-Datensatz.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Berechtigung → System blockiert mit 403.
- Datei ungültig → System lehnt Upload mit Validierungsfehler ab.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Der Anhang ist persistent gespeichert und eindeutig dem Kunden zugeordnet.
- Die Anhangsliste zeigt alle vorhandenen Attachments konsistent an.
- Es entstehen keine Auswirkungen auf Projekte oder Termine.
- Es entstehen keine verwaisten Attachment-Referenzen.

