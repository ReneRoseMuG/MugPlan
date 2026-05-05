# UC 27/01: Produktkategorie anlegen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Administrator

## Ziel

Eine neue Produktkategorie anlegen, um Produkte später kategorisieren zu können.<br>

## Vorbedingungen

- Der Nutzer ist angemeldet.
- Der Nutzer besitzt die Rolle Administrator.

## Ablauf

1. Der Administrator öffnet die Produktverwaltung.
2. Der Administrator navigiert zu „Produktkategorien".
3. Der Administrator klickt auf „+ Neue Kategorie".
4. Der Administrator gibt einen eindeutigen Namen ein (Pflichtfeld).
5. Der Administrator gibt optional eine Beschreibung ein.
6. Der Administrator speichert die Kategorie.
7. Das System validiert die Eindeutigkeit des Namens.
8. Das System persistiert die Kategorie mit `is_active = true`.

## Alternativen

- Der Name ist leer → Validierungsfehler, kein Speichern.
- Der Name existiert bereits → Validierungsfehler mit Hinweis auf Duplikat.
- Der Administrator bricht ab → Keine Kategorie wird gespeichert.

## Ergebnis

Die Produktkategorie existiert und steht in Dropdowns beim Anlegen/Bearbeiten von Produkten zur Verfügung.<br>
