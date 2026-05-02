# UC 09/06: Kunde reaktivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Ein deaktivierter Kunde wird wieder aktiviert, sodass er erneut fÃ¼r neue Projekte auswÃ¤hlbar ist.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell deaktiviert (`is_active = false`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines deaktivierten Kunden.
2. Der Akteur lÃ¶st die Aktion â€žReaktivierenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = true`.
5. Das System persistiert die Ã„nderung.
6. Das System erhÃ¶ht die Versionskennung.
7. Das System aktualisiert abhÃ¤ngige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der Kunde erscheint wieder:
    - in Kundenlisten fÃ¼r Disponenten,
    - in Projektauswahldialogen,
    - in Filtern fÃ¼r aktive Kunden.
- Bestehende Projekte, Termine, Notizen und AnhÃ¤nge bleiben unverÃ¤ndert.
- Es erfolgt keine automatische Ã„nderung an Projekten oder Terminen.

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Kunde bereits aktiv â†’ System antwortet mit 200 ohne ZustandsÃ¤nderung.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

- `is_active = true`.
- Der Kunde ist wieder vollstÃ¤ndig auswÃ¤hlbar.
- Keine fachlichen Seiteneffekte auf bestehende Projekte oder Termine.

