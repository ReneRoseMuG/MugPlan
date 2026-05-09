# UC 28/01: Tag anlegen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)

## Akteur

Administrator

## Ziel

Einen neuen Tag in der zentralen Tag-Verwaltung anlegen.

## Vorbedingungen

- Der Nutzer ist als Administrator angemeldet.

## Ablauf

1. Der Administrator öffnet die Tag-Verwaltung.
2. Der Administrator klickt auf „Neuer Tag“.
3. Der Administrator gibt Name und Farbe ein.
4. Der Administrator speichert.
5. Das System legt den Tag mit `is_default = false` an.

## Alternativen

- Der Name ist bereits vergeben: Das System zeigt einen Validierungsfehler und speichert nicht.

## Ergebnis

Der Tag ist in `tags` gespeichert und steht an allen Domänenobjekten zur Zuweisung bereit.
