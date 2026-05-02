# UC 05/01: Mitarbeiter anlegen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Einen neuen Mitarbeiter als aktive Stammdatenressource im System anlegen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Die erforderlichen Pflichtfelder sind bekannt und im Formular sichtbar.
- Es besteht keine System-Sperre (z. B. Wartungsmodus).

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt die Funktion â€žMitarbeiter anlegenâ€œ.
3. System Ã¶ffnet ein leeres Mitarbeiterformular im Modus â€žNeuâ€œ.
4. Akteur erfasst die erforderlichen Stammdaten.
5. Akteur speichert den neuen Mitarbeiter.
6. System validiert alle Pflichtfelder.
7. System legt den Mitarbeiter mit `is_active = true` an.
8. System persistiert den Datensatz.
9. System aktualisiert alle abhÃ¤ngigen Listen- und Auswahlansichten.

## Alternativen

- Pflichtfeld fehlt oder ist ungÃ¼ltig â†’
    
    System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).
    
- Akteur ohne Berechtigung â†’
    
    System blockiert den Zugriff (HTTP 403).
    
- Technischer Persistenzfehler â†’
    
    System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.
    
- Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an â†’
    
    Beide DatensÃ¤tze werden unabhÃ¤ngig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.

## Ergebnis

- Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.
- Der Mitarbeiter besitzt standardmÃ¤ÃŸig `is_active = true`.
- Der Mitarbeiter erscheint:
    - in der Mitarbeiterlistenansicht (Board und Tabelle),
    - in Dialoglisten zur Mitarbeiterzuweisung,
    - in Terminformularen zur Auswahl,
    - in Filtern, sofern aktive Mitarbeiter abgefragt werden.
- Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.
- Die TerminÃ¼bersicht des Mitarbeiters ist initial leer.
- Es wurden keine bestehenden Termine oder Projekte verÃ¤ndert.

