# UC 27/02: Produkt anlegen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e8154a475eef591e57861
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Ein neues Saunamodell (Produkt) in den Katalog aufnehmen.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt die Rolle Administrator.
- Mindestens eine Produktkategorie existiert.

## Ablauf

1. Der Administrator öffnet die Produktverwaltung.
2. Der Administrator klickt auf „+ Neues Produkt".
3. Der Administrator wählt eine Produktkategorie aus einem Dropdown.
4. Der Administrator gibt einen eindeutigen Produktnamen ein (Pflichtfeld, z.B. "Kolmikko", "Suuri").
5. Der Administrator gibt optional eine Beschreibung ein (z.B. Technische Daten, Abmessungen).
6. Der Administrator speichert das Produkt.
7. Das System validiert die Eindeutigkeit des Namens.
8. Das System persistiert das Produkt mit `is_active = true`.

## Alternativen

- Der Name ist leer oder bereits vergeben → Validierungsfehler.
- Keine Kategorie gewählt → Validierungsfehler.
- Keine aktive Kategorie vorhanden → Fehlermeldung mit Hinweis, zuerst Kategorie anzulegen.

## Ergebnis

Das Produkt existiert und steht für Auftragspositionen zur Verfügung.<br>

