# UC 09/04: Kunde deaktivieren / archivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Ein bestehender Kunde wird deaktiviert, sodass er nicht mehr fÃ¼r neue Projekte auswÃ¤hlbar ist, jedoch historisch erhalten bleibt.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell aktiv (`is_active = true`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines aktiven Kunden.
2. Der Akteur lÃ¶st die Aktion â€žDeaktivierenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = false`.
5. Das System persistiert die Ã„nderung.
6. Das System erhÃ¶ht die Versionskennung.
7. Das System aktualisiert abhÃ¤ngige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der deaktivierte Kunde erscheint nicht mehr:
    - in Projektauswahldialogen,
    - in Standard-Kundenlisten fÃ¼r Disponenten,
    - in Filtern fÃ¼r aktive Kunden.
- Bestehende Projekte und Termine bleiben unverÃ¤ndert referenziert.
- Historische Daten bleiben vollstÃ¤ndig erhalten.
- Administratoren kÃ¶nnen den Kunden weiterhin laden und anzeigen.

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Kunde bereits deaktiviert â†’ System antwortet mit 200 ohne ZustandsÃ¤nderung.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

- `is_active = false`.
- Der Kunde ist archiviert.
- Keine Projekte, Termine, Notizen oder AnhÃ¤nge werden verÃ¤ndert oder gelÃ¶scht.
- Es entstehen keine verwaisten Referenzen.

