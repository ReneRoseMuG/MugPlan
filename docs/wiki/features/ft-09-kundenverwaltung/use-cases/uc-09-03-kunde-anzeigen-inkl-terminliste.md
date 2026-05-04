# UC 09/03: Kunde anzeigen (inkl. Terminliste)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Die vollständige Kundendetailansicht wird angezeigt, einschlieÃŸlich aller Stammdaten, referenzierten Projekte, direkter Termine (ohne Projekt), projektgebundener Termine (indirekt über Projekte), sowie kundenbezogener Notizen und Anhänge.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.
- Der Kunde ist aktiv, **ODER** der Akteur ist Administrator (Administratoren können auch inaktive Kunden sehen).

## Ablauf

1. Der Akteur wählt einen Kunden aus einer Liste oder über eine Suche.
2. Das System prüft:
    1. Existiert der Kunde?
    2. Hat der Akteur Leseberechtigung? (Disponenten sehen nur aktive Kunden; Administratoren sehen alle.)
    3. Falls Checks nicht bestanden: System antwortet mit 404 oder 403.
3. Das System lädt den Kundendatensatz (Stammdaten: Name, Kundennummer, Adresse, Telefon).
4. Das System lädt alle dem Kunden direkt zugeordneten **Projekte**.
    1. Das System zeigt die Projektliste an.
5. Das System lädt alle dem Kunden zugeordneten **Direkttermine** (Termine ohne Projekt, direkt diesem Kunden zugeordnet).
    1. Das System zeigt diese als separate Liste „Direkte Termine" an.
    2. Jeder Direkttermin zeigt: Datum, Uhrzeit (falls vorhanden), Mitarbeiter, Tour (falls zugeordnet).
6. Das System lädt alle dem Kunden zugeordneten **Projekttermine** (Termine, die über Projekte diesem Kunden zugeordnet sind).
    1. Das System kann diese optional nach Projekt gruppieren oder als unified Liste zeigen.
    2. Jeder Projekttermin zeigt: Datum, Uhrzeit (falls vorhanden), Projekt, Mitarbeiter, Tour (falls zugeordnet).
7. Das System lädt alle kundenbezogenen **Notizen**.
    1. Das System zeigt die Notizenliste an.
8. Das System lädt alle kundenbezogenen **Anhänge**.
    1. Das System zeigt die Anhangsliste an mit Dateinamen und Upload-Zeitstempel.
9. Das System zeigt die Kundendetailansicht mit folgenden Bereichen:
    1. **Stammdaten** (Name, Kundennummer, Adresse, Telefon, Status aktiv/inaktiv)
    2. **Projektliste** (alle dem Kunden zugeordneten Projekte)
    3. **Direkte Termine** (Termine ohne Projekt, direkt diesem Kunden zugeordnet)
    4. **Projekttermine** (Termine über Projekte, optional nach Projekt gruppiert)
    5. **Notizenliste** (alle kundenbezogenen Notizen)
    6. **Anhangsliste** (alle kundenbezogenen Anhänge)

### **Anzeige- und Query-Regeln**

- **Rollenabhängige Filterung:** Disponenten erhalten nur aktive Kunden. Administratoren können aktive und inaktive Kunden sehen. Ein Disponent, der einen inaktiven Kunden direkt ansteuert, wird blockiert.
- **Terminlisten-Ableitungslogik:** Das System lädt Direkttermine (Termin ohne Projekt, zum Kunden gehörend) und Projekttermine (Termin mit Projekt, Projekt zum Kunden gehörend) separat und zeigt beide an.
- **Notizen:** Kundenbezogen und projektunabhängig.
- **Anhänge:** Kundenbezogen und projektunabhängig.
- **Konsistenzgarantie:** Alle Termine, egal ob direkt oder indirekt, gehören zum gleichen Kunden.

## Alternativen

- **Kunde existiert nicht:** System antwortet mit 404.
- **Akteur ohne Leseberechtigung:** System blockiert mit 403.
- **Kunde ist inaktiv, Akteur ist Disponent:** System blockiert mit 403 oder 404.
- **Keine Projekte vorhanden:** Projektliste ist leer oder wird ausgeblendet.
- **Keine Direkttermine vorhanden:** Bereich „Direkte Termine" ist leer oder wird ausgeblendet.
- **Keine Projekttermine vorhanden:** Bereich „Projekttermine" ist leer oder wird ausgeblendet.
- **Keine Notizen vorhanden:** Notizenliste ist leer oder wird ausgeblendet.
- **Keine Anhänge vorhanden:** Anhangsliste ist leer oder wird ausgeblendet.

## Ergebnis

Die Kundendetailansicht ist vollständig und konsistent dargestellt. Es werden keine Daten verändert. Die dargestellten Daten entsprechen dem aktuellen persistenten Zustand. Alle Projekte, Direkttermine, Projekttermine, Notizen und Anhänge sind sichtbar. Disponenten sehen nur aktive Kunden; Administratoren sehen alle. Keine verwaisten oder inkonsistenten Referenzen werden angezeigt.

