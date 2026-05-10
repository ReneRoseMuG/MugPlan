# UC 04/17: Tour-KW freigeben

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)
- Vorheriger Ablauf: [UC 04/16: Tour-KW blockieren und Termine parken](uc-04-16-tour-kw-blockieren-und-termine-parken.md)

## Akteur

Administrator, Disponent

## Ziel

Eine blockierte Tour-KW wieder für reguläre Wochenplanungsaktionen öffnen, ohne zuvor geparkte Termine oder entfernte Mitarbeiterzuordnungen automatisch wiederherzustellen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Administrator- oder Disponentenrechte.
- Die Tour ist eine regulär planbare Tour.
- Die Tour-KW liegt in einer für den Akteur editierbaren Kalenderwoche.
- Für die Tour-KW existiert ein blockierter Sperrstatus.

## Ablauf

1. Der Akteur öffnet eine blockierte Tour-KW-Karte im Wochenkalender, im Tourformular oder in der Tour-KW-Wochenplanung.
2. Der Akteur wählt die Aktion **Wochenplanung freigeben**.
3. Das System prüft Rolle, Tour, Kalenderwoche und vorhandenen Sperrstatus.
4. Das System setzt den Sperrstatus der Tour-KW auf freigegeben.
5. Das System aktualisiert Wochenkalender, Tourformular, Tour-KW-Wochenplanung und betroffene Kalenderprojektionen.

## Alternativen

- Leser löst die Aktion direkt aus: Das System lehnt die Mutation ab.
- Vergangene Tour-KW: Das System lehnt die Mutation als schreibgeschützt ab.
- Nicht vorhandene Tour-KW: Das System meldet, dass die Wochenplanung nicht gefunden wurde.
- Parkplatz- oder Abwesenheiten-Tour: Das System bietet keine reguläre Tour-KW-Planung an und lehnt direkte Mutationsaufrufe ab.
- Die Tour-KW ist bereits freigegeben: Das System lässt den Zustand unverändert oder meldet den aktuellen Zustand ohne Terminänderung.

## Ergebnis

Die Tour-KW ist nicht mehr blockiert. Mitarbeiterplanung und Anwenden-Aktionen können wieder über die regulären Tour-KW-Funktionen genutzt werden, sofern Rolle, Kalenderwoche und Konfliktregeln dies erlauben. Beim Freigeben werden keine Termine vom **Parkplatz** zurückverschoben, kein Zustand **Geparkt** entfernt und keine zuvor entfernten Termin- oder Tour-KW-Mitarbeiterzuordnungen automatisch rekonstruiert.
