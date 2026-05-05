# UC 09/04: Kunde deaktivieren / archivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Administrator

## Ziel

Ein bestehender Kunde wird deaktiviert, sodass er nicht mehr für neue Projekte auswählbar ist, jedoch historisch erhalten bleibt.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell aktiv (`is_active = true`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Der Akteur öffnet die Detailansicht eines aktiven Kunden.
2. Der Akteur löst die Aktion „Deaktivieren“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = false`.
5. Das System persistiert die Änderung.
6. Das System erhöht die Versionskennung.
7. Das System aktualisiert abhängige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der deaktivierte Kunde erscheint nicht mehr:
    - in Projektauswahldialogen,
    - in Standard-Kundenlisten für Disponenten,
    - in Filtern für aktive Kunden.
- Bestehende Projekte und Termine bleiben unverändert referenziert.
- Historische Daten bleiben vollständig erhalten.
- Administratoren können den Kunden weiterhin laden und anzeigen.

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Kunde bereits deaktiviert → System antwortet mit 200 ohne Zustandsänderung.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

- `is_active = false`.
- Der Kunde ist archiviert.
- Keine Projekte, Termine, Notizen oder Anhänge werden verändert oder gelöscht.
- Es entstehen keine verwaisten Referenzen.
