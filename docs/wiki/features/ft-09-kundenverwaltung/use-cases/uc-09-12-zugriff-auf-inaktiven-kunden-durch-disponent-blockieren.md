# UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent

## Ziel

Sicherstellen, dass ein Disponent weder über direkte URL noch über manipulierte API-Requests auf einen inaktiven Kunden zugreifen kann.

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
3. Das System prüft serverseitig die Zugriffsberechtigung.
4. Das System blockiert den Zugriff.
5. Das System antwortet mit 404 oder 403 gemäß Sicherheitskonzept.

---

### Sicherheits- und Query-Regel

- Die Zugriffskontrolle erfolgt ausschließlich serverseitig.
- Der Aktiv-Status wird vor Auslieferung des Datensatzes geprüft.
- Es darf kein vollständiger Kundendatensatz an einen Disponenten ausgeliefert werden, wenn `is_active = false`.

---

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ist Administrator → Zugriff wird erlaubt.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Disponenten können inaktive Kunden nicht laden oder anzeigen.
- Administratoren behalten vollständigen Zugriff.
- Die Zugriffskontrolle ist unabhängig von der UI durchgesetzt.
