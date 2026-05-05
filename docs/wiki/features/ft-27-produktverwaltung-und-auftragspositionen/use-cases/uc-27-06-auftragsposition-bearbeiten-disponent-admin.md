# UC 27/06: Auftragsposition bearbeiten (Disponent / Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Disponent, Administrator

## Ziel

Menge und Beschreibung einer bestehenden Auftragsposition ändern.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt Änderungsrechte.
- Die Auftragsposition existiert.

## Ablauf

1. Der Nutzer öffnet die Auftragsposition (z.B. durch Klick in der Tabelle).
2. Das System lädt die Positionsdaten (readonly: order_number, project_id, Stammdatenbezüge).
3. Der Nutzer ändert Menge und/oder Beschreibung.
4. Der Nutzer speichert die Änderung.
5. Das System validiert: quantity > 0.
6. Das System speichert die neuen Werte mit Versionskontrolle (Optimistic Locking).

## Alternativen

- Versionkonflikt (parallele Änderung) → HTTP 409, Fehlermeldung mit Aufforderung zum Neuladen.
- Menge ≤ 0 → Validierungsfehler.

## Ergebnis

Die Auftragsposition ist aktualisiert.<br>
