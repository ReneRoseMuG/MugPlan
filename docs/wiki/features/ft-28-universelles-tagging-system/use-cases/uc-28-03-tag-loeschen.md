# UC 28/03: Tag löschen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)

## Akteur

Administrator

## Ziel

Einen nicht mehr benötigten Tag entfernen.

## Vorbedingungen

- Der Tag ist kein Default Tag.
- Der Nutzer ist als Administrator angemeldet.

## Ablauf

1. Der Administrator wählt einen Tag in der Verwaltung.
2. Der Administrator initiiert die Löschung.
3. Das System zeigt die Anzahl betroffener Zuweisungen als Warnhinweis.
4. Das System verhindert das Löschen, wenn Relationen vorhanden sind.
5. Der Administrator bestätigt die Löschung.
6. Das System entfernt den Tag und alle zugehörigen Join-Einträge per Cascade Delete.

## Alternativen

- Der Tag ist ein Default Tag: Das System blockiert die Löschung serverseitig mit Fehlermeldung.

## Ergebnis

Der Tag ist vollständig entfernt. Betroffene Domänenobjekte haben keine verwaisten Referenzen mehr.
