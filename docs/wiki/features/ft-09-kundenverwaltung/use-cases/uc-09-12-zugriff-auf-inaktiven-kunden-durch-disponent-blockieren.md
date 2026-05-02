# UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Sicherstellen, dass ein Disponent weder Ã¼ber direkte URL noch Ã¼ber manipulierte API-Requests auf einen inaktiven Kunden zugreifen kann.

## Vorbedingungen

- Ein Kunde existiert mit `is_active = false`.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Disponent.

---

## Ablauf

1. Der Disponent versucht, einen inaktiven Kunden zu laden, z. B.:
    - durch direkte URL-Eingabe,
    - durch manipulierten API-Request,
    - durch gespeicherte alte Detailansicht.
2. Das System ermittelt:
    - Rolle des Akteurs,
    - Aktiv-Status des Kunden.
3. Das System prÃ¼ft serverseitig die Zugriffsberechtigung.
4. Das System blockiert den Zugriff.
5. Das System antwortet mit 404 oder 403 gemÃ¤ÃŸ Sicherheitskonzept.

---

### Sicherheits- und Query-Regel

- Die Zugriffskontrolle erfolgt ausschlieÃŸlich serverseitig.
- Der Aktiv-Status wird vor Auslieferung des Datensatzes geprÃ¼ft.
- Es darf kein vollstÃ¤ndiger Kundendatensatz an einen Disponenten ausgeliefert werden, wenn `is_active = false`.

---

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ist Administrator â†’ Zugriff wird erlaubt.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Disponenten kÃ¶nnen inaktive Kunden nicht laden oder anzeigen.
- Administratoren behalten vollstÃ¤ndigen Zugriff.
- Die Zugriffskontrolle ist unabhÃ¤ngig von der UI durchgesetzt.

