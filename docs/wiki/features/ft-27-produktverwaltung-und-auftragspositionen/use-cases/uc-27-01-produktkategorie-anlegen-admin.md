# UC 27/01: Produktkategorie anlegen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e8154a475eef591e57861
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Eine neue Produktkategorie anlegen, um Produkte spÃ¤ter kategorisieren zu kÃ¶nnen.<br>

## Vorbedingungen

- Der Nutzer ist angemeldet.
- Der Nutzer besitzt die Rolle Administrator.

## Ablauf

1. Der Administrator Ã¶ffnet die Produktverwaltung.
2. Der Administrator navigiert zu â€žProduktkategorien".
3. Der Administrator klickt auf â€ž+ Neue Kategorie".
4. Der Administrator gibt einen eindeutigen Namen ein (Pflichtfeld).
5. Der Administrator gibt optional eine Beschreibung ein.
6. Der Administrator speichert die Kategorie.
7. Das System validiert die Eindeutigkeit des Namens.
8. Das System persistiert die Kategorie mit `is_active = true`.

## Alternativen

- Der Name ist leer â†’ Validierungsfehler, kein Speichern.
- Der Name existiert bereits â†’ Validierungsfehler mit Hinweis auf Duplikat.
- Der Administrator bricht ab â†’ Keine Kategorie wird gespeichert.

## Ergebnis

Die Produktkategorie existiert und steht in Dropdowns beim Anlegen/Bearbeiten von Produkten zur VerfÃ¼gung.<br>

