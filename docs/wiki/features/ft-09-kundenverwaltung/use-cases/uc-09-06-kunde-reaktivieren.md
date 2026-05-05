# UC 09/06: Kunde reaktivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Administrator

## Ziel

Ein deaktivierter Kunde wird wieder aktiviert, sodass er erneut für neue Projekte auswählbar ist.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell deaktiviert (`is_active = false`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Der Akteur öffnet die Detailansicht eines deaktivierten Kunden.
2. Der Akteur löst die Aktion „Reaktivieren“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = true`.
5. Das System persistiert die Änderung.
6. Das System erhöht die Versionskennung.
7. Das System aktualisiert abhängige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der Kunde erscheint wieder:
    - in Kundenlisten für Disponenten,
    - in Projektauswahldialogen,
    - in Filtern für aktive Kunden.
- Bestehende Projekte, Termine, Notizen und Anhänge bleiben unverändert.
- Es erfolgt keine automatische Änderung an Projekten oder Terminen.

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Kunde bereits aktiv → System antwortet mit 200 ohne Zustandsänderung.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

- `is_active = true`.
- Der Kunde ist wieder vollständig auswählbar.
- Keine fachlichen Seiteneffekte auf bestehende Projekte oder Termine.
