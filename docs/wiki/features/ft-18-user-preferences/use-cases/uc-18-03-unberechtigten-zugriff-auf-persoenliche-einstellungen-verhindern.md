# UC 18/03: Unberechtigten Zugriff auf persönliche Einstellungen verhindern

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)

## Akteur

Disponent, Leser, Admin

## Ziel

Sicherstellen, dass ein Akteur ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern kann.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Für mindestens einen weiteren Akteur existieren gespeicherte persönliche Einstellungen.

## Ablauf

1. Der Akteur ruft den Bereich für persönliche Einstellungen auf.
2. Das System ermittelt anhand des Benutzerkontextes die Identität des Akteurs.
3. Das System lädt ausschließlich die dem Akteur zugeordneten Einstellungen.
4. Der Akteur versucht, direkt oder indirekt Einstellungen eines anderen Akteurs abzurufen oder zu ändern.
5. Das System prüft serverseitig die Benutzerzuordnung.
6. Das System verweigert den Zugriff auf fremde Einstellungen und liefert einen Berechtigungsfehler zurück.

## Alternativen

- Der Akteur ruft ausschließlich seine eigenen Einstellungen auf → Das System erlaubt Zugriff.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück.

## Ergebnis

Ein Akteur kann ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern. Einstellungen anderer Akteure bleiben geschützt und unverändert.
