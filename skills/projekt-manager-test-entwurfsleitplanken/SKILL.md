---
name: projekt-manager-test-entwurfsleitplanken
description: Use when Codex designs, writes, changes, reviews, plans, or runs tests in the MuGPlan / Projekt Manager repository, including unit, integration, browser/E2E, fixtures, test data, database isolation, filesystem isolation, mock decisions, permission tests, test acceptance criteria, and the `testsuite` command. Apply before proposing or implementing tests so tests prove real behavior instead of relying on generous mocks.
---

# Projekt Manager Test-Entwurfsleitplanken

Nutze diesen Skill als Testentwurfs-Gate für das Repository. `agents.md` bleibt verbindlich; bei Widersprüchen gilt `agents.md` und der Widerspruch ist kurz zu benennen.

## Grundsatz

Ein Test muss eine fachliche oder technische Funktion beweisen. Aussagekraft und Sicherungscharakter haben Vorrang vor Bequemlichkeit und kurzer Implementierungszeit.

Ein tragfähiger Test:

- baut einen echten Ausgangszustand auf,
- führt eine reale Aktion aus,
- prüft ein beobachtbares Ergebnis,
- enthält relevante Negativ- oder Gegenbeispiele,
- berührt keine produktiven Daten, Uploads, Inhalte oder Backups,
- benennt seine Testebene ehrlich.

## Pflichtablauf Vor Dem Testentwurf

1. Testebene festlegen: Unit, Integration oder Browser/E2E.
2. Zu beweisendes Verhalten in einem Satz formulieren: Ausgangszustand, Aktion, erwartetes Ergebnis.
3. Echte Objekte und Daten bestimmen, die für den Beweis nötig sind.
4. Mock-Entscheidung treffen und begründen.
5. Isolation festlegen: Temp-DB, In-Memory-DB, `tests/.runtime` oder Temp-Root für Dateien.
6. Positive Fälle, Negativfälle, Berechtigungsfälle und Konfliktfälle benennen.
7. Prüfen, ob der Test nur Sichtbarkeit oder Implementierungsdetails testet. Falls ja, Testziel verschärfen oder den Test verwerfen.

## Mock-Regeln

Mocks gehören ausschließlich in Unit-Tests.

Unit-Tests dürfen direkte Abhängigkeiten isolieren, wenn der Test weiterhin die Logik der Einheit beweist. Erlaubt sind externe Seiteneffekte wie Netzwerk, Uhrzeit, Zufall oder Dateizugriff, kleine Dependency-Doubles und gezielte Fehlerdoubles. Unit-Tests dürfen keine Wunschzustände vortäuschen, die im echten System nicht entstehen können.

Integrationstests verwenden echte Objekte und echte Daten. Keine gemockten Services, Repositories, Datenbankclients, Query-Hooks, Auth-Hooks, Router-Entscheidungen oder API-Antworten verwenden, wenn sie das Ergebnis beeinflussen. Eine Ausnahme ist nur ein technisch nötiger Parameter ohne Einfluss auf die geprüfte Funktion; sie muss im Testkommentar oder Plan ausdrücklich stehen.

Browser- und E2E-Tests verwenden echte Browserinteraktion, echte Routen, echte API-Antworten aus einer isolierten Testinstanz und echte Testdaten. UI-Hooks, API-Clients oder Berechtigungen nicht im Browsertest stubben.

## Daten Und Isolation

Für Datenbanken gilt:

- nie produktive Datenbankdateien oder Produktivziele verwenden,
- Temp-DB, In-Memory-DB oder `tests/.runtime` verwenden,
- Schema und Migrationen passend zum Produktivcode initialisieren,
- Daten vor oder nach dem Test zuverlässig entfernen,
- keine Zustände zwischen Tests durchsickern lassen,
- negative Beispiele explizit anlegen.

Für Dateisystemtests gilt:

- echtes Dateisystem verwenden,
- eindeutigen Temp-Root pro Test oder Suite verwenden,
- nie produktive Upload-, Content-, Backup- oder Datenverzeichnisse verwenden,
- Dateien, Verzeichnisse, Kollisionen und Löschpfade real prüfen,
- Cleanup robust ausführen.

## Aussagekräftige Assertions

Prüfe beobachtbare Wirkung statt Implementierungsdetails.

Gute Assertions prüfen zum Beispiel HTTP-Status, Fehlerformat und persistierten Datenbankzustand; erzeugte, geänderte oder gelöschte Dateien im Temp-Root; Rollen- und Permission-Wirkung mit echten Usern, Rollen und Sessions; Query-Invalidierung über beobachtbare neue Daten; UI-Aktionen über Nutzerinteraktion und sichtbare Folgeänderung; Versionskonflikte mit echter aktueller und veralteter Version.

Vermeide schwache Tests: nur Element vorhanden, nur Mock-Aufruf ausgelöst, Snapshot ohne fachliche Aussage, Filtertest nur mit passenden Treffern, Permission-Test mit gestubbtem `useAuth`, Integrationstest mit gemocktem Repository oder Service.

## Datengetriebene Tests

Bei Mengen, Filtern, Suchen, Sortierung, Berechtigungsgrenzen und Statuslogik immer Gegenbeispiele anlegen:

- Datensätze, die enthalten sein müssen,
- Datensätze, die ausgeschlossen sein müssen,
- Randfälle wie leerer Wert, anderer Status, andere Rolle, anderer Owner oder anderer Zeitraum,
- Assertion auf die komplette Ergebnismenge.

## Auth, Rollen Und Permissions

Geschützte Workflows mit echten Berechtigungsdaten testen.

Mindestens prüfen:

- erlaubter Zugriff mit passender Permission,
- abgelehnter Zugriff ohne ausreichende Permission,
- bei Schreiboperationen ein Reader- oder Custom-Role-Negativfall,
- bei UI-Flows, dass unzulässige Aktionen nicht angeboten werden oder serverseitig `FORBIDDEN` liefern.

Frontend-Gating ersetzt nie die API-Prüfung.

## Pflichtkommentar

Neue Testdateien verwenden den Pflichtkommentar aus `agents.md` und ergänzen bei Bedarf:

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

## Testplan-Checkliste

Jeder Testplan muss konkret benennen:

- welches Verhalten bewiesen wird,
- welche Testebene verwendet wird,
- welche echten Objekte und Daten beteiligt sind,
- welche Mocks nicht verwendet werden dürfen,
- welche Negativ- und Randfälle nötig sind,
- wie DB- oder FS-Isolation hergestellt wird,
- welche Rollen- und Permission-Fälle betroffen sind,
- welches beobachtbare Ergebnis die Abnahme trägt.

Wenn diese Punkte nicht beantwortbar sind, nicht raten. Blocker dokumentieren und die fehlende Testinfrastruktur oder fachliche Entscheidung benennen.
