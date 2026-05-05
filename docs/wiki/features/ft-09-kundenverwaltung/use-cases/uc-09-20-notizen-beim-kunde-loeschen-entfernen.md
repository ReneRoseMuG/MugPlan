# UC 09/20: Notizen beim Kunde-Löschen entfernen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Administrator

## Ziel

Sicherstellen, dass beim Löschen eines Kunden auch die zugeordneten Notizen entfernt werden und keine Restzustände entstehen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte (Administrator).
- Dem Kunden sind keine Projekte zugeordnet (Bedingung für Kunde-Löschung, siehe UC 09/13).
- Optional: Dem Kunden sind Notizen zugeordnet.

## Ablauf

1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur löst die Löschaktion aus.
3. Das System prüft, dass dem Kunden keine Projekte zugeordnet sind (siehe UC 09/13).
4. Das System löscht den Kundendatensatz (siehe UC 09/13).
5. Das System entfernt gleichzeitig alle Zuordnungen zwischen Kunde und Notizen.
6. Das System aktualisiert alle betroffenen Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den Löschvorgang ab. Der Kunde und seine Notizen bleiben bestehen.
- Kunde besitzt Projekte: Das System blockiert die Löschung bereits vor diesem Punkt (siehe UC 09/13 und UC 09/14).

## Ergebnis

Der Kunde ist vollständig gelöscht. Alle Notiz-Zuordnungen zum Kunden sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Kunden zugeordnet waren, werden ebenfalls gelöscht, sofern die Implementierung dies vorsieht.
