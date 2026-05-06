# UC 06/05: Wochenplanung für Parkplatz sperren

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

Administrator, Disponent, Leser

## Ziel

Verhindern, dass die Systemtour **Parkplatz** als reguläre Tour-KW-Planung verwendet wird. Parkplatz dient als fachlicher Zwischen- und Sonderzustand für Termine, aber nicht als Basis für Mitarbeiterplanung.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Die Systemtour **Parkplatz** existiert.

## Ablauf

1. Akteur öffnet die Parkplatz-Tour im Tourformular.
2. System zeigt die normalen Stammdaten- und Terminbereiche der Tour.
3. System bietet keinen Tab **Wochenplanung** an.
4. System lädt keine Tour-KW-Karten, keine Mitarbeiterplanungsaktionen und keinen KW-Einfügen-Schalter für Parkplatz.
5. Im Wochenkalender kann die Parkplatz-Lane Termine anzeigen, erhält aber keine Tour-KW-Personalkarte in der Personalspalte.

## Alternativen

- Akteur öffnet die übergreifende Tour-KW-Planungsansicht: System blendet Parkplatz als nicht planbare Bahn aus.
- Direkte API-Aufrufe bleiben durch die bestehenden Tour-KW-, Rollen-, Historien- und Sperrregeln serverseitig begrenzt. UI-Sichtbarkeit ersetzt keine serverseitige Durchsetzung.

## Ergebnis

Parkplatz erscheint nicht als regulärer Ursprung für Tour-KW-Mitarbeiterplanung. Termine auf Parkplatz bleiben fachlich bearbeitbar, soweit die bestehenden Termin- und Parkplatz-Regeln dies erlauben.
