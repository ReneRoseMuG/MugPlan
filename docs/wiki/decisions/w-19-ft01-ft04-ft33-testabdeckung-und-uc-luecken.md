# W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: FT-01 Kalendertermine, FT-04 Tourenplanung, FT-33 Abwesenheiten
- Entdeckt: 05.05.26
- Art: Technische Schuld

## Befund

Die Analyse der Features FT-01, FT-04 und FT-33 zeigt insgesamt eine solide Testbasis, aber mehrere fachlich relevante Lücken in Use-Case-Dokumentation und Browser-E2E-Abdeckung.

FT-01 ist auf Integrations- und Browser-Ebene breit abgesichert. Die wichtigsten fachlichen Pfade wie Termin-CRUD, Tour-Zuweisung, Mitarbeiterzuweisung, Overlap, historische Sperren, Optimistic Locking, Notizen und Storno sind vorhanden. Offen bleiben vor allem Browser-Pfade für rollenspezifische Sichtbarkeit und Abbruchfälle. Zusätzlich besteht ein bekannter Spec-Code-Widerspruch: Die Spezifikation beschreibt Admin-Zugriff auf inaktive Kunden, während `ensureActiveCustomer` im Code aktuell unabhängig von der Rolle blockiert.

FT-04 ist technisch und testseitig gut abgedeckt, insbesondere durch die Integrationstests zur Tour-KW-Planung. Die UC-Dokumentation ist aber an kritischen Stellen unvollständig: UC 04/12 und UC 04/13 sind nur Template-Platzhalter, UC 04/14 ist gesondert zu prüfen, und UC 04/03 fehlt als eigener Use Case, obwohl der fachliche Pfad "aktive Mitarbeiter einer Tour aus Terminen ableiten" im Code und in Tests existiert.

FT-33 ist fachlich und testseitig weitgehend belastbar dokumentiert. Die Analyse nennt verbleibende Browser-Lücken im Monatskalender, Wochenkalender und bei UI-Flows für Abwesenheitsarten.

## Optionen

- A) Die priorisierten Lücken gezielt schließen: zuerst FT-04-UC-Dokumentation und hoch priorisierte Browser-/Entscheidungstests.
- B) Nur die Testlücken ergänzen und die unvollständigen UC-Dokumente später nachziehen.
- C) Den Zustand vorerst als ausreichend akzeptieren und die Lücken nur bei konkreten Folgeänderungen behandeln.

## Betroffene Bereiche bei Umsetzung

FT-01 betrifft insbesondere Tests und Entscheidungsbedarf rund um historische Storno-Aktionen, Tour-Preview-Abbruch, Termine ohne Projekt, Notiz-UI aus Dispatcher-Sicht und den Widerspruch zwischen Admin-Rechten und inaktiven Kunden.

FT-04 betrifft vor allem die Feature-Wiki unter `docs/wiki/features/ft-04-tourenplanung/`, insbesondere UC 04/12, UC 04/13, UC 04/14 und den fehlenden UC 04/03. Ergänzend sind Browser-E2E-Pfade für den Abbruch im KW-Preview-Dialog und die 4-KW-Matrix zu prüfen.

FT-33 betrifft Browser-E2E-Abdeckung für den Toggle-Zustand im Monatskalender, passive Abwesenheits-Lanes im Wochenkalender, den Wechsel der Abwesenheitsart und die Label-Darstellung im Monatskalender-Abwesenheitsmodus.

## Rollen- und Sicherheitsbezug

Die offenen Punkte berühren Rollenverhalten direkt. FT-01 enthält insbesondere Unterschiede zwischen Admin und Disponent bei historischen Terminen und bei inaktiven Kunden. FT-04 enthält Rollenprüfungen für Tour- und KW-Planung. FT-33 enthält Leser-Blockaden, Dispatcher-/Admin-Flows und die Abgrenzung zwischen generischen Terminmutationen und dem freigegebenen FT-33-Abwesenheitspfad.

Bei späteren Tests oder Dokumentationskorrekturen muss ausdrücklich festgehalten werden, welche Rollen Aktionen sehen dürfen, welche Rollen Aktionen ausführen dürfen und wo die Durchsetzung serverseitig geprüft wird. Reine UI-Sichtbarkeit reicht nicht als Berechtigungsnachweis.

## Auswirkungen eines Eingriffs

Variante A erhöht die fachliche Verlässlichkeit der Wiki und macht bestehende Testabdeckung besser als Entscheidungsgrundlage nutzbar. Besonders FT-04 würde dadurch wieder eine vollständige UC-Basis für künftige Codex-Aufträge erhalten.

Testergänzungen können bestehende Spec-Code-Widersprüche sichtbar machen, insbesondere den Admin-Pfad bei inaktiven Kunden. Solche Tests wären bewusst als Entscheidungs- oder Regressionstreiber zu behandeln und dürfen nicht stillschweigend durch fachliche Umdeutung des Codes gelöst werden.

## Schadenspotential

Mittel. Dokumentationsarbeit selbst hat geringes technisches Risiko. Neue Browser- oder Integrationstests können aber produktnahe Rollen-, Termin- und Tourenlogik berühren und bei falscher Erwartung entweder instabil werden oder verdeckte Fachwidersprüche überdecken.

Das Risiko wird begrenzt, indem zuerst die fehlenden UCs präzisiert werden, anschließend Tests entlang vorhandener Fachregeln ergänzt werden und jeder Rollenfall serverseitig mitgeprüft wird.

## Vorgeschlagene Maßnahme

Variante A bevorzugen. Reihenfolge:

1. FT-04 UC 04/12, UC 04/13 und UC 04/14 fachlich vollständig ausarbeiten und UC 04/03 als fehlenden Use Case ergänzen oder bewusst anders einordnen.
2. FT-01-Hochpunkte als Tests oder Decision-Fragen behandeln: historischer Storno aus Disponent-Sicht und Admin-Zuweisung inaktiver Kunden.
3. FT-04-Browserlücken für KW-Preview-Abbruch und 4-KW-Matrix priorisiert prüfen.
4. FT-33-Browserlücken nach fachlicher Relevanz ergänzen, insbesondere Monatskalender-Toggle und passive Wochenkalender-Lane.

## Quelle

- Analyse-Datei vom 05.05.26: `C:\Users\r.rose\Downloads\analyse-ft01-ft04-ft33-testabdeckung.md`
