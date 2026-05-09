# UC 28/02: Tag bearbeiten

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)

## Akteur

Administrator

## Ziel

Einen bestehenden Tag umbenennen oder neu einfärben.

## Vorbedingungen

- Der Tag existiert.
- Der Nutzer ist als Administrator angemeldet.

## Ablauf

1. Der Administrator öffnet die Tag-Verwaltung.
2. Der Administrator wählt einen Tag.
3. Der Administrator ändert Name oder Farbe.
4. Der Administrator speichert.

## Alternativen

- Der neue Name ist bereits vergeben: Das System zeigt einen Validierungsfehler und speichert nicht.

## Ergebnis

Der Tag ist aktualisiert. Änderungen wirken sofort auf alle Zuweisungen, weil Tags referenziert und nicht kopiert werden.
