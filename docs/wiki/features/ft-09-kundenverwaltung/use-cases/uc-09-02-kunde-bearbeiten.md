# UC 09/02: Kunde bearbeiten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Bestehende Kundendaten werden aktualisiert, ohne referenzierende Projekte oder Termine inkonsistent zu machen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte.
- Eine gÃ¼ltige Versionskennung des Kunden liegt vor (Optimistic Locking).

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Kunden.
2. Das System zeigt:
    - Kundendaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.
3. Der Akteur startet die Funktion â€žBearbeitenâ€œ.
4. Das System zeigt ein editierbares Formular mit den aktuellen Werten.
5. Der Akteur Ã¤ndert zulÃ¤ssige Felder (z. B. Adresse, Telefonnummer, Kundennummer, Name).
6. Der Akteur bestÃ¤tigt die Ã„nderungen.
7. Das System prÃ¼ft:
    - Berechtigung,
    - Pflichtfelder,
    - formale Validierung,
    - Versionskennung (KonfliktprÃ¼fung).
8. Bei erfolgreicher PrÃ¼fung speichert das System die Ã„nderungen.
9. Das System erhÃ¶ht die Versionskennung.
10. Das System aktualisiert abhÃ¤ngige Ansichten.

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur nicht berechtigt â†’ System blockiert mit 403.
- Validierungsfehler â†’ System lehnt ab, keine Speicherung.
- Versionskonflikt â†’ System blockiert mit 409, fordert Neuladen.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

- Kundendaten sind aktualisiert persistiert.
- Bestehende Projekte und Termine referenzieren weiterhin denselben Kunden.
- In Projektansichten, Kalender-Tooltips und Druckfunktionen erscheinen die aktualisierten Kundendaten.
- Es werden keine Projekte, Termine oder Notizen verÃ¤ndert.

