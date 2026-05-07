# A-11 - FT-19 Attachment-Testlücken schließen

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Attachments
- Typ: Testabdeckung
- Erstellt: 07.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-aenderungsauftrag-tests-ft19-2026-05-06.md`
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-19 Attachments
- Use Cases:
  - UC 19/01 - Attachment hochladen
  - UC 19/05 - Größen- und Typvalidierung
  - UC 19/07 - Attachment-Kaskade bei Parent-Löschung
  - UC 19/10 - Attachment-Duplikat entfernen
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - Keine.

## Ziel

Die im Änderungsauftrag benannten FT-19-Testlücken sollen fachlich belastbar geschlossen oder kontrolliert als bekannte Lücke dokumentiert werden. Der Schwerpunkt liegt auf serverseitigen Attachment-Regeln, Download-Verhalten, Kaskaden bei Parent-Löschung und einem isolierten Browser-Upload-Flow.

## Ausgangslage

Der Import beschreibt mehrere konkrete Test- und Klärungsaufträge. Ein Teil betrifft bereits ausformulierte, aber übersprungene Integrationstests; andere Punkte betreffen fehlende Assertions, fehlende Browser-E2E-Abdeckung oder uneindeutige Testkommentare.

## Umfang

Zur Aufgabe gehören:

- `describe.skip` für historische Termin-Sonderregeln bei Appointment-Attachments klären und aktivieren oder als `todo` mit Begründung markieren
- `content-disposition` für Employee-, Customer-, Project- und Appointment-Downloads explizit testen und gegebenenfalls vereinheitlichen
- Attachment-Kaskaden bei Projekt- und, falls API-seitig vorhanden, Kundenlöschung absichern
- irreführende Fehlerfall-Kommentare in Appointment-Attachment-Tests korrigieren
- Browser-E2E-Test für den Projekt-Upload-Flow mit Admin und Dispatcher ergänzen
- Browser-Validierung für zu große Upload-Dateien prüfen
- Browser-Fixtures mit fiktivem `storagePath` eindeutig als Browser-only markieren
- UC 19/10 für das Entfernen eines Attachment-Duplikats ergänzen

Nicht Teil der Aufgabe ist eine fachliche Neudefinition von FT-19 ohne Rücksprache. Falls der Code bewusst von FT-19 abweicht, ist dies zu dokumentieren statt stillschweigend umzudeuten.

## Umsetzungshinweise

- Integrationstests müssen mit Test-DB-Safety-Gate und `--reporter=verbose` laufen.
- Neue oder geänderte Tests sollen echte API-, Persistenz- oder Browser-Flows verwenden, soweit der Auftrag dies fordert.
- Für Parent-Löschungen dürfen keine Service-Direktzugriffe genutzt werden, wenn der Auftrag ausdrücklich API-Flows verlangt.
- Synthetische Testdaten mit eindeutigen Tokens verwenden.
- Kommentare müssen das tatsächlich geprüfte Verhalten beschreiben.

## Rollen- und Sicherheitsbezug

Betroffen sind mindestens Admin- und Dispatcher-Uploadpfade sowie unautorisierte, nicht erlaubte oder historische Attachment-Operationen.

Die Tests müssen echte serverseitige Session-, Rollen-, Historien- und Größenprüfungen abdecken. Reine UI-Sichtbarkeit oder symbolische Mocks reichen nicht als Nachweis.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-aenderungsauftrag-tests-ft19-2026-05-06.md`

## Blocker und offene Fragen

- Falls die serverseitige Regel für historische Termin-Deletes fehlt, darf sie nicht ohne Rücksprache implementiert werden.
- Falls kein Kunden-Delete-Endpunkt existiert, ist die Kunden-Kaskade nur als bekannte API-Lücke dokumentierbar.
- Falls Employee-Downloads bewusst immer als Attachment ausgeliefert werden sollen, braucht diese Abweichung eine fachliche Begründung in Test und Handler.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
