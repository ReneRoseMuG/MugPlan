# FT (24): Fahrzeugverwaltung

## Metadaten

- Status: Backlog / nicht spezifiziert
- Typ: Feature-Hülle

## Ziel / Zweck

Dieses Feature bündelt Anforderungen zur Verwaltung von Fahrzeugen im Planungsprozess.

Die lokale Feature-Hülle hält das aus Notion übernommene Backlog-Item sichtbar, bis die fachlichen Anforderungen ausreichend geklärt sind, um daraus Use Cases, Regeln und technische Umsetzungspfade abzuleiten.

## Fachliche Beschreibung

Fahrzeuge sollen künftig als eigene Planungsressourcen betrachtet werden können. Das bisher bekannte Backlog beschreibt die Zuweisung von Fahrzeugen zu Touren oder Mitarbeitern sowie die Verwaltung fahrzeugbezogener Termine wie TÜV und Reifenwechsel.

Ob Fahrzeuge als Stammdatenobjekte, als disponierbare Ressourcen, als Terminbezug oder als Kombination daraus modelliert werden, ist noch offen.

## Regeln & Randbedingungen

- Fahrzeugverwaltung ist fachlich noch nicht spezifiziert.
- Fahrzeugzuweisungen dürfen bestehende Termin-, Touren- und Mitarbeiterregeln nicht stillschweigend umgehen.
- Fahrzeugtermine sind von regulären Kundenterminen und Kalendermarkern abzugrenzen.
- Rollen, Sichtbarkeit und Mutationsrechte für Fahrzeuge, Fahrzeugzuweisungen und Fahrzeugtermine sind vor Umsetzung ausdrücklich zu klären.

## Use Cases

Noch keine Use Cases angelegt.

## Backlogs

- [BL (07): Fahrzeugverwaltung](backlog/ft-24-fahrzeugverwaltung-backlog.md)

## Architektur & Kontext

Noch nicht spezifiziert.

Mögliche fachliche Berührungspunkte:

- FT (01): Kalendertermine
- FT (03): Kalenderansichten
- FT (04): Tourenplanung
- FT (05): Mitarbeiterverwaltung
- FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung

## Entscheidungen & Offene Punkte

- Soll ein Fahrzeug ein eigenes Stammdatenobjekt werden?
- Wird ein Fahrzeug einer Tour, einem Mitarbeiter, einem Termin oder mehreren dieser Objekte zugeordnet?
- Wie werden fahrzeugbezogene Termine wie TÜV und Reifenwechsel fachlich von Kunden- und Planungsterminen getrennt?
- Welche Rollen dürfen Fahrzeuge sehen, anlegen, bearbeiten, löschen und zuweisen?
