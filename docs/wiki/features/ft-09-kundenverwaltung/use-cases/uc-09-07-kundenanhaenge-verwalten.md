# UC 09/07: KundenanhÃ¤nge verwalten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Dokumente werden einem Kunden zugeordnet, angezeigt und heruntergeladen, ohne die fachliche IntegritÃ¤t des Kunden oder referenzierender Projekte zu beeintrÃ¤chtigen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; fÃ¼r Upload zusÃ¤tzlich Ã„nderungsrechte.
- Die hochzuladende Datei entspricht erlaubten Formaten und GrÃ¶ÃŸenbeschrÃ¤nkungen.

---

## Ablauf â€“ Anhang hochladen

1. Der Akteur Ã¶ffnet die Kundendetailansicht.
2. Der Akteur startet die Funktion â€žAnhang hinzufÃ¼genâ€œ.
3. Der Akteur wÃ¤hlt eine Datei aus.
4. Das System prÃ¼ft:
    - Authentifizierung,
    - Berechtigung,
    - Dateiformat,
    - DateigrÃ¶ÃŸe.
5. Das System speichert die Datei serverseitig unter persistentem Speichername.
6. Das System legt einen Attachment-Datensatz mit Parent-Referenz auf den Kunden an.
7. Das System speichert Metadaten (Originalname, MIME-Typ, GrÃ¶ÃŸe, Zeitstempel).
8. Das System aktualisiert die Anhangsliste in der UI.

---

## Ablauf â€“ Anhang anzeigen / herunterladen

1. Der Akteur Ã¶ffnet die Anhangsliste des Kunden.
2. Das System lÃ¤dt alle dem Kunden zugeordneten Attachments.
3. Der Akteur wÃ¤hlt einen Anhang aus.
4. Das System liefert die Datei Ã¼ber einen gesicherten Download-Endpunkt aus.
5. Je nach Dateityp erfolgt Inline-Anzeige oder Download.

---

## Regeln und EinschrÃ¤nkungen

- Ein Attachment kann nicht ohne Parent-Kunde existieren.
- Attachments sind kundenbezogen und unabhÃ¤ngig von Projekten.
- Eine physische LÃ¶schung von Attachments ist systemweit nicht vorgesehen.
- Das LÃ¶schen eines Kunden entfernt referenzierte Notizen (CASCADE), jedoch keine physische DateilÃ¶schung ist spezifiziert.
- Mehrere Akteure kÃ¶nnen parallel AnhÃ¤nge hochladen; jeder Upload erzeugt einen eigenstÃ¤ndigen Attachment-Datensatz.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Berechtigung â†’ System blockiert mit 403.
- Datei ungÃ¼ltig â†’ System lehnt Upload mit Validierungsfehler ab.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Der Anhang ist persistent gespeichert und eindeutig dem Kunden zugeordnet.
- Die Anhangsliste zeigt alle vorhandenen Attachments konsistent an.
- Es entstehen keine Auswirkungen auf Projekte oder Termine.
- Es entstehen keine verwaisten Attachment-Referenzen.

