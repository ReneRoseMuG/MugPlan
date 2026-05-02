# Workflow: Update Codebase gegen Feature

## Zweck

Dieser Workflow prüft die aktuelle Implementierung gegen den Inhalt eines konkreten Features.

## Eingabe

- Feature-ID, zum Beispiel `FT (01)`
- Optionaler Fokus, zum Beispiel ein Use Case, eine Rolle oder ein bekannter Widerspruch

## Ablauf

1. Feature-Datei, zugehörige Use Cases, Backlogs, Entscheidungen und relevante Journal-Einträge lesen.
2. Betroffene Codebereiche ausgehend vom Feature-Kontext identifizieren.
3. Rollen, erlaubte Sichtbarkeit, erlaubte Aktionen und technische Durchsetzung ausdrücklich prüfen.
4. Implementierung gegen Feature-Inhalt vergleichen.
5. Abweichungen nach Risiko und Schadenspotential bewerten.
6. Änderungen vorschlagen, aber nicht automatisch ausführen.

## Ergebnis

Der Report enthält:

- geprüfte Quellen
- geprüfte Codebereiche
- bestätigte Übereinstimmungen
- Abweichungen und Risiken
- betroffene Rollen und Rechte
- vorgeschlagene Änderungen
- offene Klärpunkte

## Verbot

Dieser Workflow verändert weder Code noch Spezifikation automatisch.
