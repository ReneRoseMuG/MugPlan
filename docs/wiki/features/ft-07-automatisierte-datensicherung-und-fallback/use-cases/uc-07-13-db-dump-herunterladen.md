# UC 07/13: DB-Dump herunterladen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

Administrator

## Ziel

Einen vorhandenen DB-Dump herunterladen.

## Vorbedingungen

- Administrator ist angemeldet.
- Dump-Datei existiert serverseitig.

## Ablauf

- Administrator öffnet die Dump- oder Backup-Ansicht.
- System listet vorhandene Dumps.
- Administrator lädt einen Dump herunter.
- System liefert das ZIP-Archiv aus.

## Alternativen

- Nicht-Admin ruft den Endpunkt auf → Zugriff wird serverseitig verweigert.
- Datei existiert nicht → System liefert einen fachlichen Fehler.

## Ergebnis

Der Administrator erhält das Dump-ZIP. Es kann sensible Auth-Daten wie Passwort-Hashes und 2FA-Felder enthalten und muss entsprechend geschützt behandelt werden.
