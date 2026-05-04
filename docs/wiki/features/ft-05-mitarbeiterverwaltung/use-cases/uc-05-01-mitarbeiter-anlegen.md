# UC 05/01: Mitarbeiter anlegen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

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

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt die Funktion „Mitarbeiter anlegen“.
3. System öffnet ein leeres Mitarbeiterformular im Modus „Neu“.
4. Akteur erfasst die erforderlichen Stammdaten.
5. Akteur speichert den neuen Mitarbeiter.
6. System validiert alle Pflichtfelder.
7. System legt den Mitarbeiter mit `is_active = true` an.
8. System persistiert den Datensatz.
9. System aktualisiert alle abhängigen Listen- und Auswahlansichten.

## Alternativen

- Pflichtfeld fehlt oder ist ungültig →
    
    System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).
    
- Akteur ohne Berechtigung →
    
    System blockiert den Zugriff (HTTP 403).
    
- Technischer Persistenzfehler →
    
    System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.
    
- Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an →
    
    Beide Datensätze werden unabhängig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.

## Ergebnis

- Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.
- Der Mitarbeiter besitzt standardmäÃŸig `is_active = true`.
- Der Mitarbeiter erscheint:
    - in der Mitarbeiterlistenansicht (Board und Tabelle),
    - in Dialoglisten zur Mitarbeiterzuweisung,
    - in Terminformularen zur Auswahl,
    - in Filtern, sofern aktive Mitarbeiter abgefragt werden.
- Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.
- Die Terminübersicht des Mitarbeiters ist initial leer.
- Es wurden keine bestehenden Termine oder Projekte verändert.

