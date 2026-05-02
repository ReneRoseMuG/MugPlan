# UC 27/04: Komponente anlegen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../feature.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e8154a475eef591e57861
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Eine neue Komponente (Bauteil) in den Katalog aufnehmen.<br>

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt die Rolle Administrator.
- Mindestens eine Komponentenkategorie existiert.

## Ablauf

1. Der Administrator öffnet die Komponentenverwaltung.
2. Der Administrator klickt auf „+ Neue Komponente".
3. Der Administrator wählt eine Komponentenkategorie aus einem Dropdown.
4. Der Administrator gibt einen eindeutigen Komponentennamen ein (z.B. "Rückwand mit Fenster", "Ofen", "Vorderwand").
5. Der Administrator gibt optional eine Beschreibung ein.
6. Der Administrator speichert die Komponente.
7. Das System validiert die Eindeutigkeit des Namens.
8. Das System persistiert die Komponente mit `is_active = true`.

## Alternativen

- Der Name ist leer oder bereits vergeben → Validierungsfehler.
- Keine Kategorie gewählt → Validierungsfehler.

## Ergebnis

Die Komponente existiert und steht für Auftragspositionen zur Verfügung.<br>
