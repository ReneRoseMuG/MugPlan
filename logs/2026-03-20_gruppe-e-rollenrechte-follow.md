# Gruppe E - Rollen, Rechte und fachlich heikle gruen laufende Lage

## 1. Bearbeitete Gruppe

- Name der Gruppe: Gruppe E - Rollen, Rechte und fachlich heikle gruen laufende Lage
- Betroffene Testdateien:
  - `tests/unit/ft04/TourTests.test.ts`
  - `tests/integration/server/ft11.team-management.integration.test.ts`
  - `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
- Fachlicher Fokus:
  - fachlich irrefuehrende Ist-Festschreibungen aus laufenden Tests entfernen, ohne weiterhin benoetigte Verhaltensabsicherung fuer Touren, Teams und Projektdetails zu verlieren

## 2. Durchgefuehrte Aenderungen

- Beibehalten:
  - die echten FT04-Service-Checks fuer Namensvergabe, Versionsvalidierung, Version-Konflikte und Delete-Blockade bei verknuepften Terminen
  - die FT11-Integrationschecks fuer Team-CRUD, Member-Assign/Remove, Relation-Cleanup, Duplicate-Assign und Delete-Cleanup
  - den FT02-Integrationscheck auf den aggregierten Projektdetail-Response
- Ersetzt:
  - in `tests/unit/ft04/TourTests.test.ts` wurden die zwei Contract-Ist-Tests entfernt, die das aktuelle Ignorieren eines `name`-Feldes als Soll konserviert haben
  - in `tests/integration/server/ft11.team-management.integration.test.ts` wurde der Test entfernt, der fehlende serverseitige 403-Grenzen fuer READER/DISPATCHER als akzeptiertes Verhalten festgeschrieben hat
  - in `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts` wurden driftende Ziel- und Gap-Kommentare auf den real geprueften Aggregate-Response korrigiert
- Geloescht:
  - keine komplette Testdatei
- Neue oder ergaenzte Verhaltenstests:
  - keine neuen Dateien; diese Gruppe wurde durch gezieltes Entfernen irrefuehrender Assertions und praezisere fachliche Beschreibung verbessert

## 3. Fachliche Verbesserung

- Welches echte Verhalten jetzt geprueft wird:
  - FT04 prueft weiter serverseitige Tour-Namensvergabe, Versionsgrenzen, Konfliktmapping und Loeschschutz
  - FT11 prueft weiter echte API-Wirkungen fuer Team- und Team-Mitarbeiter-Endpunkte
  - FT02 prueft weiter den realen aggregierten Projektdetail-Response mit `project`, `customer`, `projectNotes`, `projectAttachments` und `projectAppointments`
- Welche fruehere Scheinsicherheit entfernt wurde:
  - das aktuelle Fehlen von `name` im Tour-Contract wird nicht mehr als gewuenschtes Soll regressionssicher gemacht
  - fehlende serverseitige Rollen-Guards der FT11-Teamrouten werden nicht mehr als korrektes Verhalten festgeschrieben
  - der Projektdetail-Test behauptet keine absichtliche Soll-Luecke mehr, obwohl der Endpoint die geprueften Aggregatefelder real liefert
- Welche Luecken innerhalb der Gruppe weiterhin bestehen:
  - fuer FT11 waeren fachlich sinnvolle 403-Solltests fuer READER- und DISPATCHER-Schreibzugriffe wichtig, sind aber mit dem aktuellen Produktionscode nicht gruen umsetzbar

## 4. Testergebnis

- Ausgefuehrte betroffene Tests:
  - `npm run test:unit -- tests/unit/ft04/TourTests.test.ts`
  - `npm run test:integration -- --reporter=verbose tests/integration/server/ft11.team-management.integration.test.ts`
  - `npm run test:integration -- --reporter=verbose tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
- Gruen:
  - `tests/unit/ft04/TourTests.test.ts` mit 9/9 erfolgreichen Tests
  - `tests/integration/server/ft11.team-management.integration.test.ts` mit 9/9 erfolgreichen Tests
  - `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts` mit 1/1 erfolgreichem Test
- Fehlschlaege:
  - keine

## 5. Offene Blocker

- Fachlich sinnvoll waeren serverseitige FT11-Rechte-Tests mit `403 FORBIDDEN` fuer unberechtigte Team-Mutationen.
- Diese sind derzeit ohne Produktionsaenderung nicht sauber umsetzbar, weil `teamsRoutes`, `teamsController` und `teamsService` aktuell keine entsprechenden Rollen-Guards durchsetzen.
