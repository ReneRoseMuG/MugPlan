# UC 04/15: Tour-KW-Wochenplanung anzeigen und anwenden

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Administrator, Disponent, Leser

## Ziel

Tour-KW-Planungen über mehrere Kalenderwochen als Matrix einsehen und zulässige Wochenplanungsaktionen ausführen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Es existieren planbare Touren.
- Für schreibende Aktionen besitzt der Akteur Administrator- oder Disponentenrechte.

## Ablauf

1. Akteur öffnet die Tourenverwaltung und wechselt in den Tab **Wochenplanung**.
2. System zeigt vier Kalenderwochen als Spalten und planbare Touren als Bahnen.
3. System blendet **Parkplatz**, **Abwesenheiten** und tourlose Pseudo-Bahnen aus.
4. Akteur kann Tour-Bahnen wie im Wochenkalender aufklappen oder zuklappen.
5. Akteur sieht je Tour-KW die geplanten Mitarbeiter, den Sperrstatus und vorhandene Tour-KW-Notizen.
6. Administrator oder Disponent öffnet bei Bedarf eine Kachelaktion, um Notizen zu pflegen, Mitarbeiter zu ändern, die Planung zu blockieren oder freizugeben oder die Planung auf passende Termine anzuwenden.
7. System nutzt für jede Mutation die bestehenden Tour-KW-Services mit Rollen-, Historien-, Konflikt- und Sperrprüfung.

## Alternativen

- Leser öffnet die Ansicht: System zeigt die Lesesicht ohne schreibende Aktionen.
- Vergangene Tour-KW: System zeigt die Kachel schreibgeschützt; direkte Mutationen werden serverseitig abgelehnt.
- Blockierte Tour-KW: System verhindert Mitarbeiteränderungen und Anwenden-Aktionen, bis die Woche freigegeben wird.
- Konflikte beim Anwenden: System zeigt die bestehende Vorschau; konfliktbehaftete Termine bleiben deaktiviert und werden nicht mutiert.

## Ergebnis

Der Akteur erhält eine kompakte Vier-KW-Übersicht über die Tour-Wochenplanung. Zulässige Aktionen verändern ausschließlich bestehende Tour-KW- oder Termin-Mitarbeiterpfade und erzeugen keine separate Planungslogik.
