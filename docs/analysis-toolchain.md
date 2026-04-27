# Lokaler Analyse-Stack

## Ziel

Dieser Stack ergänzt den bestehenden Build-, Test- und Audit-Pfad um nachgelagerte lokale Prüfungen für Architektur, Importgrenzen, Coverage und Repo-Hygiene.

Er ändert keine Business-Logik, keine UI-Abläufe, keine API-Verträge und kein Datenbankschema. Die Prüfungen laufen bewusst getrennt von der Code-Erzeugung, damit generierter oder manuell geschriebener Code im Anschluss mit denselben Regeln bewertet werden kann.

## Eingerichtete Tools

### `dependency-cruiser`

Prüft Importbeziehungen auf Architekturebene und erzeugt bei Bedarf einen lesbaren HTML-Graphen.

Abgedeckte Regeln in diesem Repository:

- keine zyklischen Abhängigkeiten
- `shared/` bleibt unabhängig von `client/`, `server/` und `tests/`
- Präsentationscode in `client/src/components/ui`, `client/src/pages` und flachen UI-Komponenten darf nicht direkt in `server/`, `migrations/`, `script/` oder `scripts/` greifen
- `server/routes/*` dürfen nicht direkt `services` oder `repositories` importieren
- `server/controllers/*` dürfen nicht direkt `repositories` importieren
- `server/repositories/*` dürfen nicht zurück in `routes`, `controllers` oder `services` greifen
- Feature-Unterordner unter `client/src/components/{calendar,document-extraction,filters,notes,print,reports,tags}` dürfen keine privaten Interna anderer Feature-Unterordner importieren
- Produktivcode darf keine Testdateien direkt importieren

### `eslint-plugin-boundaries`

Spiegelt die wichtigsten Importgrenzen bereits auf Lint-/Editor-Ebene, damit Verstöße früher sichtbar werden als erst im Architekturreport.

Abgesichert werden:

- `shared` bleibt unabhängig
- Client-Code greift nicht direkt in Server-Layer
- Server-Layer folgen der Kette Route → Controller → Service → Repository
- Tests dürfen gezielt breiter importieren als Produktivcode

### Coverage über Vitest

Der vorhandene Vitest-Stack wurde erweitert, nicht ersetzt.

Coverage erzeugt jetzt:

- Textreport für lokale Konsole
- HTML-Report unter `tests/coverage`
- `lcov` für spätere Tool-Anbindungen oder lokale Weiterverarbeitung

Die Coverage ist zunächst report-orientiert. Es gibt bewusst noch keine harte Prozentgrenze, damit das Repository nicht sofort unbrauchbar blockiert.

### `Knip`

Knip läuft hier zunächst als Diagnosewerkzeug und meldet:

- ungenutzte Dependencies
- ungenutzte Exporte
- ungenutzte Dateien

Der Auftrag enthält absichtlich keine automatische Bereinigung oder Massenlöschung.

## Scripts

- `npm run audit:local`  
  Führt den lokalen Voll-Audit seriell aus und druckt am Ende einen kompakten Kurzreport über alle Teilprüfungen.

### Einzelne Analysen

- `npm run analyze:arch`  
  Prüft die Architekturregeln mit `dependency-cruiser`.

- `npm run analyze:arch:graph`  
  Erzeugt einen HTML-Graphen unter `.tmp-analysis/dependency-graph.html`.

- `npm run analyze:boundaries`  
  Führt ESLint mit den zusätzlichen Boundary-Regeln aus.

- `npm run analyze:coverage`  
  Startet den vorhandenen Vitest-Runner mit Coverage-Reports.

- `npm run analyze:knip`  
  Führt Knip als Diagnose-Report ohne harten Exit-Code aus.

- `npm run analyze:knip:deps`  
  Zeigt nur ungenutzte Dependencies.

- `npm run analyze:knip:exports`  
  Zeigt nur ungenutzte Exporte.

- `npm run analyze:knip:files`  
  Zeigt nur ungenutzte Dateien.

### Sammelprüfung

- `npm run analyze:all`

  Bündelt die lokal ohne weitere Fremdinstallation nutzbaren Prüfungen:

  - Architekturregeln
  - Boundary-Regeln
  - Coverage-Reporting
  - Knip-Report

## Einbindung in den bestehenden Audit-Ablauf

Der bestehende einzelne npm-Befehl `npm run audit` bleibt bewusst ein reiner `npm audit`-Check.

Für den Agenten-Kurzbefehl `audit` gibt es jetzt zusätzlich den lokalen Voll-Audit:

```bash
npm run audit:local
```

Dieser Lauf führt seriell aus:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`
- `npm run analyze:arch`
- `npm run analyze:boundaries`
- `npm run analyze:coverage`
- `npm run analyze:knip`

Anschließend gibt der Runner einen kompakten Kurzreport mit Status, Laufzeit und einer knappen Zusammenfassung je Teilprüfung aus. Der Agent kann diesen Kurzreport direkt im Abschluss verwenden.

## Hart vs. report-orientiert

Aktuell ist der lokale Stack bewusst gestuft:

- hart bzw. mit Fehlerstatus:
  - `analyze:boundaries`
  - `analyze:coverage` sofern der zugrunde liegende Testlauf fehlschlägt

- report-orientiert:
  - `analyze:arch` meldet bestehende Altverstöße derzeit als Warnungen, damit neue Architekturregeln eingeführt werden können, ohne produktiven Code in diesem Auftrag zu refactoren
  - `analyze:knip` läuft mit `--no-exit-code`, damit Bestandsbefunde zunächst sichtbar werden, aber nicht sofort blockieren

Diese Einstufung ist absichtlich konservativ und kann später schrittweise verschärft werden.

## Verwendete Layer und Verzeichnisse

Die Regeln wurden aus der vorhandenen Struktur des Repositories abgeleitet:

- `server/routes`
- `server/controllers`
- `server/services`
- `server/repositories`
- `server/{bootstrap,config,lib,middleware,security,settings}`
- `shared`
- `client/src/pages`
- `client/src/components`
- `client/src/components/ui`
- `client/src/hooks`
- `client/src/lib`
- `client/src/{providers,contexts}`
- `tests`

## Bewusst nicht umgesetzt

- keine externen Cloud-Services
- keine GitHub-Actions- oder PR-Workflows
- keine SonarQube-/SonarCloud-Anbindung
- keine CodeRabbit-Integration
- kein Mutation-Testing mit Stryker
- kein zusätzlicher lokaler Security-Scanner außerhalb der bereits vorhandenen Secret-Prüfung
- keine harten Coverage-Gates

Diese Punkte wurden wegen der Vorgabe „nur lokal, keine externen Services“ bewusst ausgeklammert.

## Bekannte Grenzen

- Die Frontend-Struktur ist nur teilweise als echte Feature-Slice-Struktur organisiert. Deshalb wird Feature-Privatsphäre nur für klar abgegrenzte Unterordner unter `client/src/components/*` erzwungen.
- `Knip` läuft zunächst report-orientiert mit `--no-exit-code`, damit Bestandsbefunde nicht sofort blockierend wirken.
- Der lokale Voll-Audit führt alle Teilprüfungen seriell aus und beendet sich erst nach dem vollständigen Durchlauf. Einzelne Fehlzustände werden gesammelt im Kurzreport sichtbar.

## Sinnvolle spätere Verschärfungen

- `Knip` schrittweise von Diagnose zu Gate entwickeln
- Coverage-Schwellen auf Basis realer Ist-Werte ergänzen
- optional später einen zusätzlichen lokalen Security-Scanner evaluieren
- optional später einen lokalen Git-Hook oder einen separaten Team-Standard für `audit:local` definieren
