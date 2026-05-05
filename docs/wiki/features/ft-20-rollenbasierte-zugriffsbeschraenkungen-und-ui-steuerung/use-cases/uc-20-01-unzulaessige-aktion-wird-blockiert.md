# UC 20/01: Unzulässige Aktion wird blockiert

## Metadaten

- Feature: [FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung](../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md)

## Akteur

Admin, Disponent, Leser

## Ziel

Verhindern, dass ein Akteur eine fachliche Mutation ausführt, für die seine Rolle keine Berechtigung besitzt.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Die angeforderte Aktion erfordert eine bestimmte Rolle.
- Der Akteur besitzt diese Rolle nicht.

## Ablauf

1. Akteur startet eine fachliche Mutation (z. B. Anlegen, Bearbeiten oder Löschen eines Objekts).
2. Das System prüft serverseitig die Rolle des Akteurs.
3. Das System vergleicht die Rolle mit den für die Aktion definierten Berechtigungen.
4. Das System verweigert die Ausführung der Mutation.
5. Das System antwortet mit HTTP-Status 403.

## Alternativen

- Die Aktion wird ausschließlich über die UI angeboten, aber serverseitig ebenfalls geprüft.
- Der Akteur versucht einen Direktaufruf eines Endpunkts → Das System blockiert mit 403.

## Ergebnis

Die Mutation wird nicht durchgeführt.

Es erfolgt keine Datenänderung.
