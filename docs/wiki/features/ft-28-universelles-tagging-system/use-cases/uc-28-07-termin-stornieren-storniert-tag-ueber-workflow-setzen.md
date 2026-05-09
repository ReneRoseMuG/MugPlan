# UC 28/07: Termin stornieren – Storniert-Tag über Workflow setzen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)

## Akteur

Disponent, Administrator

## Ziel

Den Storniert-Tag an einem Termin ausschließlich über die dedizierte Storno-Aktion setzen, nicht über den Tag-Picker.

## Vorbedingungen

- Der Termin ist noch nicht storniert.
- Der Termin liegt nicht in der Vergangenheit.

## Ablauf

1. Der Akteur löst den Storno-Workflow gemäß FT (01) aus.
2. Das System führt die Stornierung als atomare Transaktion aus.
3. Das System entfernt Mitarbeiterzuweisungen.
4. Das System setzt den Auftragsbetrag auf 0.
5. Das System setzt den Storniert-Tag.

## Alternativen

- Versuch, den Storniert-Tag manuell über den Tag-Picker zu setzen: Das System weist die Änderung serverseitig mit `CANCELLATION_TAG_PROTECTED` ab.

## Ergebnis

Der Termin trägt den Storniert-Tag und ist für weitere Mutationen gesperrt.
