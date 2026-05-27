---
name: projekt-manager-test-entwurfsleitplanken
description: Use when Codex designs, writes, changes, reviews, or plans tests in the Projekt Manager repository, especially for unit, integration, browser/E2E, fixtures, test data, database isolation, filesystem isolation, mock decisions, permission tests, and test acceptance criteria. Apply before proposing or implementing tests so tests prove real behavior instead of relying on generous mocks.
---

# Projekt Manager Test-Entwurfsleitplanken

Nutze diesen Skill als Testentwurfs-Gate für das Repository. `agents.md` bleibt die verbindliche Quelle; bei Widersprüchen gilt `agents.md` und der Widerspruch ist kurz zu benennen.

## Grundsatz

Ein Test muss eine fachliche oder technische Funktion beweisen. Bequemlichkeit, Ausführungszeit und kurze Implementierung sind nachrangig gegenüber Aussagekraft und Sicherungscharakter.

Ein Test ist nur tragfähig, wenn er:

- einen echten Ausgangszustand aufbaut,
- eine reale Aktion ausführt,
- ein beobachtbares Ergebnis prüft,
- relevante Negativ- oder Gegenbeispiele enthält,
- keine produktiven Daten, Uploads, Inhalte oder Backups berührt,
- seine Testebene ehrlich benennt.

## Pflichtablauf vor dem Testentwurf

1. Testebene festlegen: Unit, Integration oder Browser/E2E.
2. Zu beweisendes Verhalten in einem Satz formulieren: Ausgangszustand, Aktion, erwartetes Ergebnis.
3. Echte Objekte und echte Daten bestimmen, die für den Beweis nötig sind.
4. Mock-Entscheidung treffen und begründen.
5. Isolation festlegen: Temp-DB, In-Memory-DB, `tests/.runtime` oder Temp-Root für Dateien.
6. Positive Fälle, Negativfälle, Berechtigungsfälle und Konfliktfälle benennen.
7. Prüfen, ob der Test nur Sichtbarkeit oder nur Implementierungsdetails testet. Falls ja, Testziel verschärfen oder den Test verwerfen.

## Mock-Regeln

Mocks gehören ausschließlich in Unit-Tests.

### Unit-Tests

Mocks sind erlaubt, wenn sie direkte Abhängigkeiten isolieren und der Test weiterhin die Logik der getesteten Einheit beweist.

Erlaubt sind insbesondere:

- externe Seiteneffekte wie Netzwerk, Uhrzeit, Zufall oder Dateizugriff, wenn sie nicht selbst Gegenstand des Tests sind,
- kleine Dependency-Doubles für klar begrenzte Collaborators,
- Fehlerdoubles, um seltene Fehlerpfade gezielt auszulösen.

Auch Unit-Tests dürfen keine beliebigen Wunschzustände vortäuschen, die im echten System nicht entstehen können.

### Integrationstests

Integrationstests verwenden echte Objekte und echte Daten. Keine gemockten Services, Repositories, Datenbankclients, Query-Hooks, Auth-Hooks, Router-Entscheidungen oder API-Antworten verwenden, wenn diese das Ergebnis beeinflussen.

Zulässig ist nur eine dokumentierte Ausnahme, wenn ein Objekt ausschließlich als technisch nötiger Parameter übergeben wird und nachweislich keinen Einfluss auf die geprüfte Funktion hat. Die Ausnahme muss im Testkommentar oder im Plan explizit stehen.

Wenn ein Integrationstest nur mit einem einflussreichen Mock möglich wäre, den Test nicht als Integrationstest schreiben. Den Blocker dokumentieren und eine echte Testgrenze oder Testinfrastruktur herstellen.

### Browser- und E2E-Tests

Browser-/E2E-Tests verwenden echte Browserinteraktion, echte Routen, echte API-Antworten aus einer isolierten Testinstanz und echte Testdaten. UI-Hooks, API-Clients oder Berechtigungen nicht im Browsertest stubben.

## Echte Daten und Isolation

Verwende pro Test oder Testsuite kontrollierte echte Testdaten. Bevorzuge öffentliche APIs, Services oder Repositories der jeweils getesteten Schicht, statt interne Zustände direkt zu manipulieren.

Für Datenbanken gilt:

- nie produktive SQLite-Dateien oder `apps/api/data/` verwenden,
- Temp-DB, In-Memory-DB oder `tests/.runtime` verwenden,
- Schema/Migrationen passend zum Produktivcode initialisieren,
- Daten vor oder nach dem Test zuverlässig entfernen,
- keine Zustände zwischen Tests durchsickern lassen,
- negative Beispiele explizit anlegen, statt nur positive Treffer zu prüfen.

Für Dateisystemtests gilt:

- echtes Dateisystem verwenden,
- einen eindeutigen Temp-Root pro Test oder Suite verwenden,
- nie `apps/api/uploads/`, `apps/api/content/` oder `apps/api/backups/` verwenden,
- Dateien, Verzeichnisse, Kollisionen und Löschpfade real prüfen,
- Cleanup robust ausführen.

## Aussagekräftige Assertions

Prüfe beobachtbare Wirkung statt Implementierungsdetails.

Gute Assertions prüfen zum Beispiel:

- HTTP-Status, Fehlerformat und persistierten Datenbankzustand,
- erzeugte, geänderte oder gelöschte Dateien im Temp-Root,
- Rollen- und Permission-Wirkung mit echten Usern, Rollen und Sessions,
- Query-Invalidierung über beobachtbare neue Daten, nicht über gespypte interne Aufrufe,
- UI-Aktionen über Nutzerinteraktion und sichtbare Folgeänderung,
- Versionskonflikte mit echter aktueller und veralteter Version.

Schwache Tests vermeiden:

- nur Button, Label oder Komponente vorhanden,
- nur Mock-Aufruf wurde ausgelöst,
- nur Snapshot ohne fachliche Aussage,
- Filtertest nur mit passenden Treffern,
- Permission-Test mit gestubbtem `useAuth`,
- Integrationstest mit gemocktem Repository oder Service,
- Testdaten, die einen fachlich unmöglichen Zustand herstellen.

## Datengetriebene Tests

Bei Mengen, Filtern, Suchen, Sortierung, Berechtigungsgrenzen und Statuslogik immer Gegenbeispiele anlegen.

Ein Filtertest braucht mindestens:

- Datensätze, die enthalten sein müssen,
- Datensätze, die ausgeschlossen sein müssen,
- einen Randfall wie leerer Wert, anderer Status, andere Rolle, anderer Owner oder anderer Zeitraum,
- eine Assertion auf die komplette Ergebnismenge, nicht nur auf einzelne enthaltene Elemente.

## Auth, Rollen und Permissions

Geschützte Workflows mit echten Berechtigungsdaten testen.

Mindestens prüfen:

- erlaubter Zugriff mit passender Permission,
- abgelehnter Zugriff ohne ausreichende Permission,
- bei Schreiboperationen ein Reader- oder Custom-Role-Negativfall,
- bei UI-Flows, dass unzulässige Aktionen nicht angeboten werden oder serverseitig `FORBIDDEN` liefern.

Frontend-Gating ersetzt nie die API-Prüfung.

## Testkommentar

Neue Testdateien verwenden den Pflichtkommentar aus `agents.md` und ergänzen bei Bedarf diese Angaben:

```ts
/**
 * Test Scope:
 *
 * Test-Ebene:
 * - <Unit | Integration | Browser/E2E>
 *
 * Realitätsgrad:
 * - <echte App/DB/FS/API/User/Rollen oder begründete Abgrenzung>
 *
 * Mock-Entscheidung:
 * - <keine Mocks | Unit-Mocks: ... | Ausnahme ohne Einfluss: ...>
 *
 * Isolation:
 * - <Temp-DB/In-Memory-DB/tests/.runtime/Temp-Root>
 *
 * Abgedeckte Regeln:
 * - <Regel 1>
 *
 * Fehlerfälle:
 * - <Fehlerfall 1>
 *
 * Ziel:
 * <Kurzbeschreibung der Absicherung>
 */
```

## Plan-Checkliste für Tests

Jeder Testplan muss konkret benennen:

- welches Verhalten bewiesen wird,
- welche Testebene dafür verwendet wird,
- welche echten Objekte und Daten beteiligt sind,
- welche Mocks nicht verwendet werden dürfen,
- welche Negativ- und Randfälle nötig sind,
- wie DB- oder FS-Isolation hergestellt wird,
- welche Rollen- und Permission-Fälle betroffen sind,
- welches beobachtbare Ergebnis die Abnahme trägt.

Wenn diese Punkte nicht beantwortbar sind, nicht raten. Blocker dokumentieren und die fehlende Testinfrastruktur oder fehlende fachliche Entscheidung benennen.
