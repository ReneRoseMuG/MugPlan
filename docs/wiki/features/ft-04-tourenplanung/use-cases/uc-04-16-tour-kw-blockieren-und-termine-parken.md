# UC 04/16: Tour-KW blockieren und Termine parken

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)
- Siehe auch: [UC 06/04: Termin auf Parkplatz setzen](../../ft-06-automatische-regeln/use-cases/uc-06-04-termin-auf-parkplatz-setzen.md)

## Akteur

Administrator, Disponent

## Ziel

Eine Tour-KW bewusst aus der aktiven Wochenplanung nehmen, alle betroffenen nicht stornierten Termine dieser Tour und Kalenderwoche parken und die Tour-KW-Mitarbeiterplanung für diese Woche leeren.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Administrator- oder Disponentenrechte.
- Die Tour ist eine regulär planbare Tour.
- Die Tour-KW liegt in einer für den Akteur editierbaren Kalenderwoche.
- Die Systemtour **Parkplatz** und der Zustand **Geparkt** sind verfügbar.

## Ablauf

1. Der Akteur öffnet eine Tour-KW-Karte im Wochenkalender, im Tourformular oder in der Tour-KW-Wochenplanung.
2. Der Akteur wählt die Aktion **Wochenplanung blockieren**.
3. Das System prüft Rolle, Tour, Kalenderwoche, Sperrstatus und die erforderlichen Parkplatz-Grundlagen.
4. Das System ermittelt die Termine dieser Tour in der betroffenen Kalenderwoche.
5. Das System parkt alle betroffenen nicht stornierten Termine über den bestehenden Parkplatz-Workflow aus [UC 06/04](../../ft-06-automatische-regeln/use-cases/uc-06-04-termin-auf-parkplatz-setzen.md).
6. Das System entfernt die gespeicherten Tour-KW-Mitarbeiterzuordnungen dieser Tour und Kalenderwoche.
7. Das System setzt den Sperrstatus der Tour-KW auf blockiert.
8. Das System aktualisiert Wochenkalender, Tourformular, Tour-KW-Wochenplanung, Monitoring und betroffene Terminansichten.

## Alternativen

- Leser löst die Aktion direkt aus: Das System lehnt die Mutation ab.
- Vergangene Tour-KW: Das System lehnt die Mutation als schreibgeschützt ab.
- Parkplatz- oder Abwesenheiten-Tour: Das System bietet keine reguläre Tour-KW-Planung an und lehnt direkte Mutationsaufrufe ab.
- Systemtour **Parkplatz** oder Zustand **Geparkt** fehlt: Das System bricht die Mutation ab und verändert keine Termine.
- Stornierte Termine in der Tour-KW: Das System lässt sie in ihrem bestehenden Zustand und zählt sie nicht als geparkte Termine.
- Bereits geparkte Termine: Das System behandelt sie idempotent und parkt sie nicht erneut.

## Ergebnis

Die Tour-KW ist blockiert. Nicht stornierte betroffene Termine liegen auf **Parkplatz**, tragen **Geparkt** und besitzen keine Mitarbeiterzuweisungen. Die Tour-KW enthält keine gespeicherten Mitarbeiterzuordnungen mehr. Weitere Mitarbeiteränderungen und Anwenden-Aktionen für diese Tour-KW bleiben gesperrt, bis die Tour-KW wieder freigegeben wird.
