# UC 09/14: Kunde löschen mit Referenzen (Blockade)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Kunde nicht gelöscht werden kann, wenn ihm mindestens ein Projekt zugeordnet ist, um referenzielle Integrität zu gewährleisten.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden ist mindestens ein Projekt zugeordnet.
- Eine gültige Versionskennung liegt vor.

---

## Ablauf

1. Der Administrator öffnet die Detailansicht des Kunden.
2. Der Administrator löst die Aktion „Löschen“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - Existenz referenzierender Projekte.
4. Das System stellt fest, dass mindestens ein Projekt existiert.
5. Das System blockiert den Löschvorgang.
6. Das System antwortet mit 409 (Konflikt) und gibt einen Hinweis auf bestehende Referenzen.

---

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Der Kunde bleibt unverändert im System bestehen.
- Bestehende Projekte und Termine behalten ihre Referenzen.
- Es entstehen keine verwaisten Fremdschlüssel oder inkonsistenten Zustände.

