# UC 09/14: Kunde lÃ¶schen mit Referenzen (Blockade)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Kunde nicht gelÃ¶scht werden kann, wenn ihm mindestens ein Projekt zugeordnet ist, um referenzielle IntegritÃ¤t zu gewÃ¤hrleisten.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden ist mindestens ein Projekt zugeordnet.
- Eine gÃ¼ltige Versionskennung liegt vor.

---

## Ablauf

1. Der Administrator Ã¶ffnet die Detailansicht des Kunden.
2. Der Administrator lÃ¶st die Aktion â€žLÃ¶schenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - Existenz referenzierender Projekte.
4. Das System stellt fest, dass mindestens ein Projekt existiert.
5. Das System blockiert den LÃ¶schvorgang.
6. Das System antwortet mit 409 (Konflikt) und gibt einen Hinweis auf bestehende Referenzen.

---

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Der Kunde bleibt unverÃ¤ndert im System bestehen.
- Bestehende Projekte und Termine behalten ihre Referenzen.
- Es entstehen keine verwaisten FremdschlÃ¼ssel oder inkonsistenten ZustÃ¤nde.

