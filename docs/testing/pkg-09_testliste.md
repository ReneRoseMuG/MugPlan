# PKG-09 Testliste

## Ziel von PKG-09
PKG-09 sichert den Basis-Demo-Seed fuer Personen-, Team-/Tour-Zuordnung und Projekt-Status-Verteilung ab:

1. Personenbezogene Seed-Daten folgen festen Formaten (Name, DE-Telefon, E-Mail-Schema).
2. Basis-Seed erzeugt exakt 3 Teams und 3 Touren.
3. Jede Tour und jedes Team hat 1-3 zugewiesene Mitarbeiter, Rest bleibt unzugeordnet.
4. Projekt-Status werden aus dem Formular verarbeitet und pro Projekt zufaellig mit 1-2 Status verknuepft.
5. Ungueltige Eingaben liefern deterministische Validierungsfehler.

## Abdeckungsuebersicht
- Datei `tests/integration/seed/demoSeed.base.core.test.ts`: 4 Integrationstests
- Datei `tests/unit/seed/demoDataFiller.format.test.ts`: 3 Unit-Tests
- Datei `tests/unit/seed/demoSeedAssignments.test.ts`: 2 Unit-Tests
