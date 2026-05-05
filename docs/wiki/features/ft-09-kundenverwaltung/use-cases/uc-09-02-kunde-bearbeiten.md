# UC 09/02: Kunde bearbeiten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Bestehende Kundendaten werden aktualisiert, ohne referenzierende Projekte oder Termine inkonsistent zu machen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte.
- Eine gültige Versionskennung des Kunden liegt vor (Optimistic Locking).

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.
2. Das System zeigt:
    - Kundendaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.
3. Der Akteur startet die Funktion „Bearbeiten“.
4. Das System zeigt ein editierbares Formular mit den aktuellen Werten.
5. Der Akteur ändert zulässige Felder (z. B. Adresse, Telefonnummer, Kundennummer, Name).
6. Der Akteur bestätigt die Änderungen.
7. Das System prüft:
    - Berechtigung,
    - Pflichtfelder,
    - formale Validierung,
    - Versionskennung (Konfliktprüfung).
8. Bei erfolgreicher Prüfung speichert das System die Änderungen.
9. Das System erhöht die Versionskennung.
10. Das System aktualisiert abhängige Ansichten.

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur nicht berechtigt → System blockiert mit 403.
- Validierungsfehler → System lehnt ab, keine Speicherung.
- Versionskonflikt → System blockiert mit 409, fordert Neuladen.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

- Kundendaten sind aktualisiert persistiert.
- Bestehende Projekte und Termine referenzieren weiterhin denselben Kunden.
- In Projektansichten, Kalender-Tooltips und Druckfunktionen erscheinen die aktualisierten Kundendaten.
- Es werden keine Projekte, Termine oder Notizen verändert.
