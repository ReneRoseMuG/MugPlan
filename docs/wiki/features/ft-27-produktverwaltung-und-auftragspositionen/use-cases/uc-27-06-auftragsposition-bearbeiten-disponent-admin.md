# UC 27/06: Auftragsposition bearbeiten (Disponent / Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e8154a475eef591e57861
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Menge und Beschreibung einer bestehenden Auftragsposition Ã¤ndern.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt Ã„nderungsrechte.
- Die Auftragsposition existiert.

## Ablauf

1. Der Nutzer Ã¶ffnet die Auftragsposition (z.B. durch Klick in der Tabelle).
2. Das System lÃ¤dt die Positionsdaten (readonly: order_number, project_id, StammdatenbezÃ¼ge).
3. Der Nutzer Ã¤ndert Menge und/oder Beschreibung.
4. Der Nutzer speichert die Ã„nderung.
5. Das System validiert: quantity > 0.
6. Das System speichert die neuen Werte mit Versionskontrolle (Optimistic Locking).

## Alternativen

- Versionkonflikt (parallele Ã„nderung) â†’ HTTP 409, Fehlermeldung mit Aufforderung zum Neuladen.
- Menge â‰¤ 0 â†’ Validierungsfehler.

## Ergebnis

Die Auftragsposition ist aktualisiert.<br>

