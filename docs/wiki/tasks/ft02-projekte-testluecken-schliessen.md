# FT-02 Projekte: Test-Lücken schließen

Die FT-02-Testlücken rund um Projekt-Integrationstests, Projekt-Notizen, Aktivierung, Tagging und UC-Beschriftungen sollen gezielt geschlossen werden. Die Aufgabe bündelt mehrere konkrete Änderungsanweisungen aus dem Test-Lücken-Scan vom 09.05.26, damit die Arbeiten als Teil von Projekt P-02 priorisiert und nachverfolgt werden können.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Feature-Testabdeckung | Testabdeckung | 09.05.26 |

---

## Ziel

Die Aufgabe soll die bekannten FT-02-Testlücken in belastbare Integrations- und API-Tests überführen. Zusätzlich sollen technische Anti-Patterns in bestehenden Projekt-Integrationstests sichtbar gemacht und anschließend gezielt auf den zentralen API-Test-Harness umgestellt werden.

## Ausgangslage

Der Test-Lücken-Scan für FT-02 Projekte vom 09.05.26 benennt mehrere konkrete Lücken: eigene Express-App-Aufbauten in Integrationstests, fehlende Tests für Notiz-Pinning, Projekt-Aktivierung und Projekt-Tagging sowie fehlerhafte UC-Beschriftungen im Haupttest. Zwei fachliche Punkte bleiben offen und müssen vor deterministischen Tests entschieden oder bewusst ausgeklammert werden.

## Umfang

- Die Integrationstests unter `tests/integration/server/` sollen zunächst auf Dateien geprüft werden, die `registerRoutes` für eigene App-Aufbauten importieren.
- Die betroffenen Integrationstestdateien sollen anschließend seriell auf `createApiTestApp()` und die zentrale `loginAdminAgent(app)`-Hilfsfunktion umgestellt werden.
- Der Repository-Bypass `insertAppointmentRaw()` in `projects.scope.mengenlogik.integration.test.ts` soll entweder durch eine passende Fixture-Fabrik ersetzt oder mit einem knappen Kommentar begründet werden.
- Für UC 02/23 sollen Tests für das Pinnen und Lospinnen von Projektnotizen ergänzt werden.
- Für UC 02/24 soll ein Test den Deaktivierungs- und Reaktivierungsnachweis über echte Listen-Endpunkte führen.
- Im FT-02-Haupttest sollen falsch beschriftete UC-Testfälle korrigiert und ein Test für UC 02/04 Tags ändern ergänzt werden.
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition des Verhaltens inaktiver Projekte in Kalenderansichten ohne vorherige Entscheidung.
- Nicht Teil der Aufgabe ist ein separater Artikellistenfilter-Test für UC 02/07, solange dessen Priorität fachlich nicht entschieden ist.

## Umsetzungshinweise

- Vor Testausführung gilt das Must-Pass Safety Gate aus `agents.md`; Tests müssen im Testmodus und gegen erlaubte Test-DB-Ziele laufen.
- Relevante Einstiegspunkte sind `tests/helpers/apiTestHarness.ts`, `tests/integration/server/ft02.full-uc-coverage.integration.test.ts` und bestehende Projekt-Integrationstests unter `tests/integration/server/`.
- Testdaten müssen realistisch, synthetisch und eindeutig tokenisiert sein; reine `toHaveLength`-Nachweise reichen für Listen-Identität nicht aus.
- Die neuen Tests sollen echte API-Calls und DB- beziehungsweise Persistenzpfade nutzen, keine Mocks auf Projektnotizen oder Projektdaten.
- Bei Rollenbezug sind erlaubte Rollen, erlaubte Aktionen und serverseitige Durchsetzung ausdrücklich zu prüfen; reine UI-Sichtbarkeit reicht nicht.
- Die Dateien sollen seriell bearbeitet und nach jeder Korrektur mit passenden Einzeltestbefehlen verifiziert werden.

## Blocker und offene Fragen

- Für UC 02/07 ist offen, ob der Artikellistenfilter als separater Auftrag formuliert oder bis zur Stabilisierung von UC 02/26 zurückgestellt wird.
- Für inaktive Projekte in Kalenderansichten ist offen, ob laufende Termine weiterhin sichtbar bleiben sollen.

---

## Beziehungen

- Features: FT-02 Projekte
- Use Cases: UC 02/04 · UC 02/07 · UC 02/23 · UC 02/24 · UC 02/26
- Entscheidungen: —
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../projects/feature-testabdeckung-uc-luecken.md)
