---
name: test-entwurfsleitplanken
description: >
  Testentwurfs-Gate für das MuGPlan Repository. IMMER verwenden wenn Tests
  geplant, geschrieben, geändert, bewertet oder ausgeführt werden. Auslöser:
  Testsuite, Testabdeckung, Integrationstest, E2E, Fixtures, Testdaten,
  Datenbankisolation, Mock-Entscheidung, Berechtigungstest, Abnahmekriterien.
  Gilt auch bei Code-Änderungen die bestehende Tests berühren (agents.md §4.4).
---

# Test-Entwurfsleitplanken — MuGPlan

`agents.md` bleibt die verbindliche Quelle. Bei Widersprüchen gilt `agents.md`.

## Grundsatz

Ein Test muss eine fachliche oder technische Funktion beweisen. Aussagekraft und Sicherungscharakter haben Vorrang vor Bequemlichkeit und kurzer Implementierungszeit.

Ein Test ist nur tragfähig wenn er:
- einen echten Ausgangszustand aufbaut
- eine reale Aktion ausführt
- ein beobachtbares Ergebnis prüft
- relevante Negativ- oder Gegenbeispiele enthält
- keine produktiven Daten, Uploads oder Inhalte berührt
- seine Testebene ehrlich benennt

## Schutzregeln

- In einer Code-Test-Fix-Session keinen Produktivcode ändern, der nicht ausdrücklich beauftragt ist.
- Keine vollständigen oder breiten Testläufe ohne ausdrückliche Beauftragung — standardmäßig nur die direkt betroffenen Tests.
- Must-Pass Safety Gate vor jeder Testausführung prüfen (agents.md §12): `.env.test` vorhanden, `NODE_ENV=test`, `MUGPLAN_MODE=test`, DB-Allowlist aktiv.

## Pflichtablauf vor dem Testentwurf

Bei Code-Bezug zuerst Graphify anwenden (`graphify query` für den geänderten Bereich), dann:

1. Testebene festlegen: Unit, Integration oder Browser/E2E
2. Zu beweisendes Verhalten in einem Satz: Ausgangszustand → Aktion → erwartetes Ergebnis
3. Echte Objekte und Daten bestimmen die für den Beweis nötig sind
4. Mock-Entscheidung treffen und begründen
5. Isolation festlegen: Testdatenbank (`mugplan_test`), `os.tmpdir()` für Dateisystem
6. Positive Fälle, Negativfälle, Berechtigungsfälle und Konfliktfälle benennen
7. Prüfen ob der Test nur Sichtbarkeit oder Implementierungsdetails testet — falls ja, Testziel verschärfen oder verwerfen

## Mock-Regeln

### Unit-Tests
Mocks erlaubt für: externe Seiteneffekte (Netzwerk, Uhrzeit, Zufall, Dateizugriff), klar begrenzte Collaborators, Fehlerdoubles für seltene Fehlerpfade. Keine Wunschzustände vortäuschen die im echten System nicht entstehen können.

### Integrationstests
Keine Mocks. Echte Objekte, echte Daten, echte Services, Repositories, DB-Clients (MySQL via `mugplan_test`), Auth und API-Antworten. Einstieg immer über `tests/helpers/testDataFactory.ts`. App-Instanz über `createApiTestApp()`.

Ist ein Mock unvermeidlich → kein Integrationstest schreiben, Blocker dokumentieren.

### Browser/E2E-Tests
Echte Browserinteraktion (Playwright), echte Routen, echte API-Antworten aus isolierter Testinstanz, echte Testdaten. Keine gestubbten UI-Hooks, API-Clients oder Berechtigungen.

## Echte Daten und Isolation

**Datenbank:**
- Nie produktive Datenbank — ausschließlich `mugplan_test` (oder Worker-DB `mugplan_w<N>_test`)
- Setup/Teardown über `tests/setup.env.ts`
- Factory-Einstieg zwingend über `tests/helpers/testDataFactory.ts`
- Gegenbeispiele explizit anlegen — nicht nur positive Treffer prüfen

**Dateisystem:**
- Schreibzugriffe ausschließlich in `os.tmpdir()`
- Nie produktive Uploads- oder Backup-Pfade berühren
- Robustes Cleanup in `afterEach`/`afterAll`

## Aussagekräftige Assertions

**Gut:** HTTP-Status + Fehlerformat + persistierter DB-Zustand, erzeugte/geänderte/gelöschte Datensätze in der Test-DB, Rollen-/Permission-Wirkung mit echten Usern und Sessions.

**Schwach (vermeiden):**
- Nur Element vorhanden oder Button sichtbar
- Nur Mock-Aufruf ausgelöst
- Filtertest nur mit positiven Treffern
- Permission-Test mit gestubbtem Auth
- Integrationstest mit gemocktem Repository oder Service

## Datengetriebene Tests

Mengen, Filter, Suchen, Sortierung, Berechtigungsgrenzen und Statuslogik brauchen immer Gegenbeispiele:
- Datensätze die enthalten sein müssen
- Datensätze die ausgeschlossen sein müssen
- Einen Randfall (leer, anderer Status, andere Rolle, anderer Zeitraum)
- Assertion auf die komplette Ergebnismenge — nicht nur auf einzelne Elemente

## Auth und Rollen

Mindestpflicht für geschützte Workflows:
- Erlaubter Zugriff mit passender Permission
- Abgelehnter Zugriff ohne ausreichende Permission
- Bei Schreiboperationen: Negativfall mit unzureichender Rolle

Frontend-Gating ersetzt nie die API-Prüfung.

## Pflichtkommentar in Testdateien

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
 * - <mugplan_test / os.tmpdir() / ...>
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

Jeder Testplan benennt konkret:
- Welches Verhalten bewiesen wird
- Welche Testebene verwendet wird
- Welche echten Objekte und Daten beteiligt sind
- Welche Mocks nicht verwendet werden dürfen
- Welche Negativ- und Randfälle nötig sind
- Wie DB- oder FS-Isolation hergestellt wird
- Welche Rollen- und Permission-Fälle betroffen sind
- Welches beobachtbare Ergebnis die Abnahme trägt

Wenn diese Punkte nicht beantwortbar sind: nicht raten — Blocker dokumentieren.
