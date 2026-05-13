# FT-19 Attachment-Testlücken schließen

Die im Änderungsauftrag benannten FT-19-Testlücken sollen fachlich belastbar geschlossen oder kontrolliert als bekannte Lücke dokumentiert werden. Der Schwerpunkt liegt auf serverseitigen Attachment-Regeln, Download-Verhalten, Kaskaden bei Parent-Löschung und einem isolierten Browser-Upload-Flow. Der Import beschreibt mehrere konkrete Test- und Klärungsaufträge. Ein Teil betrifft bereits ausformulierte, aber übersprungene Integrationstests; andere Punkte betreffen fehlende Assertions, fehlende Browser-E2E-Abdeckung.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Attachments | Testabdeckung | 07.05.26 |

---

## Ziel

Die im Änderungsauftrag benannten FT-19-Testlücken sollen fachlich belastbar geschlossen oder kontrolliert als bekannte Lücke dokumentiert werden. Der Schwerpunkt liegt auf serverseitigen Attachment-Regeln, Download-Verhalten, Kaskaden bei Parent-Löschung und einem isolierten Browser-Upload-Flow.

## Ausgangslage

Der Import beschreibt mehrere konkrete Test- und Klärungsaufträge. Ein Teil betrifft bereits ausformulierte, aber übersprungene Integrationstests; andere Punkte betreffen fehlende Assertions, fehlende Browser-E2E-Abdeckung oder uneindeutige Testkommentare.

## Umfang

- Zur Aufgabe gehören:
- `describe.skip` für historische Termin-Sonderregeln bei Appointment-Attachments klären und aktivieren oder als `todo` mit Begründung markieren
- `content-disposition` für Employee-, Customer-, Project- und Appointment-Downloads explizit testen und gegebenenfalls vereinheitlichen
- Attachment-Kaskaden bei Projekt- und, falls API-seitig vorhanden, Kundenlöschung absichern
- irreführende Fehlerfall-Kommentare in Appointment-Attachment-Tests korrigieren
- Browser-E2E-Test für den Projekt-Upload-Flow mit Admin und Dispatcher ergänzen
- Browser-Validierung für zu große Upload-Dateien prüfen
- Browser-Fixtures mit fiktivem `storagePath` eindeutig als Browser-only markieren
- UC 19/10 für das Entfernen eines Attachment-Duplikats ergänzen
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition von FT-19 ohne Rücksprache. Falls der Code bewusst von FT-19 abweicht, ist dies zu dokumentieren statt stillschweigend umzudeuten.

## Umsetzungshinweise

- Integrationstests müssen mit Test-DB-Safety-Gate und `--reporter=verbose` laufen.
- Neue oder geänderte Tests sollen echte API-, Persistenz- oder Browser-Flows verwenden, soweit der Auftrag dies fordert.
- Für Parent-Löschungen dürfen keine Service-Direktzugriffe genutzt werden, wenn der Auftrag ausdrücklich API-Flows verlangt.
- Synthetische Testdaten mit eindeutigen Tokens verwenden.
- Kommentare müssen das tatsächlich geprüfte Verhalten beschreiben.
- Betroffen sind mindestens Admin- und Dispatcher-Uploadpfade sowie unautorisierte, nicht erlaubte oder historische Attachment-Operationen.
- Die Tests müssen echte serverseitige Session-, Rollen-, Historien- und Größenprüfungen abdecken. Reine UI-Sichtbarkeit oder symbolische Mocks reichen nicht als Nachweis.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 14.05.26
- Ergebnis: Die FT-19-Testlücken wurden tests-only geschlossen oder fachlich aus dem Produktumfang genommen. Historische Termin-Attachment-Deletes sind aktiv getestet, Download-Dispositionen und Duplikatsuche wurden ergänzt, Projektlöschung bereinigt Attachment-Referenzen. Kundenlöschung ist kein vorgesehener Produktumfang; ein vorhandenes Script als Workaround reicht fachlich aus. Physische Dateien bei Projektlöschung bleiben im aktuellen Verhalten.
- Verifikation: `npm run test:integration -- tests/integration/server/attachments.delete.ft19.integration.test.ts tests/integration/server/customers.attachments.ft19.integration.test.ts tests/integration/server/projects.delete.rules.test.ts tests/integration/server/attachmentQueries.ft24.integration.test.ts --reporter=verbose`; gemeinsamer Abschlusslauf `npm run test:integration -- tests/integration/server/appointments.cancellation.integration.test.ts tests/integration/server/attachmentQueries.ft24.integration.test.ts tests/integration/server/attachments.delete.ft19.integration.test.ts tests/integration/server/customers.attachments.ft19.integration.test.ts tests/integration/server/ft02.full-uc-coverage.integration.test.ts tests/integration/server/projects.delete.rules.test.ts tests/integration/server/projects.scope.mengenlogik.integration.test.ts tests/integration/server/reportConfigs.reportEffects.integration.test.ts tests/integration/server/tour-print-preview.integration.test.ts --reporter=verbose` mit 97 bestandenen Tests.
- Folgeaufgaben: Keine.

---

## Beziehungen

- Features: FT-19 Attachments
- Use Cases: UC 19/01 - Attachment hochladen · UC 19/05 - Größen- und Typvalidierung · UC 19/07 - Attachment-Kaskade bei Parent-Löschung · UC 19/10 - Attachment-Duplikat entfernen
- Entscheidungen: —
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../../projects/feature-testabdeckung-uc-luecken.md)
- Journal: [14.05.26 - P02: Feature-Testabdeckung und UC-Lücken abgeschlossen](../../journal/14-05-26-p02-feature-testabdeckung-uc-luecken-abgeschlossen.md)
