# W-20 - FT-07 Dump- und Import-Hardening

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: FT-07 Automatisierte Datensicherung und Fallback
- Entdeckt: 05.05.26
- Art: Architektur-Refaktoring

## Befund

Der Admin-Dump/Import-Mechanismus enthält mehrere sicherheits- und betriebsrelevante Schwachstellen, die in einem zusammenhängenden Hardening behandelt werden sollen.

Die Codebasis unterscheidet zwischen scheduled Dumps und manuellen Admin-Dumps. Scheduled Dumps laufen über den Backup-Scheduler und unterliegen einer 30-Tage-Retention. Manuelle Admin-Dumps liegen dagegen unter `{basePath}/dumps/` und werden aktuell nicht automatisch bereinigt. Zusätzlich erzeugt jeder Import Transfer-Artefakte unter `{basePath}/transfers/<datum>/<transferId>/`, die ebenfalls dauerhaft liegen bleiben können.

Weitere offene Punkte betreffen den Dump-Vertrag, Upload-Restore-Atomizität, Foreign-Key-Check-Handling, einen ungemounteten Legacy-Importpfad und Path-Traversal-Schutz beim Staging von Uploads.

## Optionen

- A) FT-07 in einem kontrollierten Hardening-Auftrag schichtenweise absichern und Tests für die kritischen Pfade ergänzen.
- B) Nur Retention für manuelle Dumps und Transfer-Artefakte ergänzen und sicherheitsrelevante Importthemen später behandeln.
- C) Den aktuellen Zustand beibehalten und die Risiken nur operativ dokumentieren.

## Betroffene Bereiche bei Umsetzung

Der spätere Eingriff betrifft mindestens:

- `server/services/dumpService.ts`
- `server/services/dumpTransferStorageService.ts`
- `server/services/backupRetentionService.ts`
- `server/services/backupStorageService.ts`
- `server/controllers/dumpController.ts`
- `server/routes/backupRoutes.ts`
- `tests/unit/services/dumpService.test.ts`
- `tests/unit/services/backupRetentionService.test.ts`

In `dumpService.ts` soll geprüft werden, ob `users` und `roles` weiterhin vom Dump ausgeschlossen sind. Wenn ja, sind beide Tabellen in den Dump-Vertrag aufzunehmen, mit `roles` vor `users`, weil Benutzer auf Rollen referenzieren. Dabei ist zu dokumentieren, dass Dumps dadurch sensible Zugangsdaten wie Passwort-Hashes enthalten.

Die Retention soll manuelle Dump-Dateien und Transfer-Tagesverzeichnisse in denselben regelmäßigen Cleanup-Lauf bringen wie die bestehenden scheduled Backups. Der genaue Integrationspunkt ist vor Umsetzung anhand des vorhandenen Schedulers zu bestimmen.

Der Importpfad muss außerdem gegen FK-Check-Pool-Leaks, schwache Upload-Staging-Pfade und nicht dokumentierte Teilfehler beim Upload-Restore gehärtet werden. Der ungemountete Legacy-Pfad `importDump` soll nur entfernt werden, wenn vorher bestätigt ist, dass keine Route und kein Service ihn nutzt.

## Rollen- und Sicherheitsbezug

FT-07 Dump, Preview, Import, Download und Cleanup sind Admin-nahe Betriebsfunktionen. Sichtbarkeit und Ausführung sind ausschließlich für Administratoren zulässig und müssen serverseitig durchgesetzt bleiben. Reine UI-Sichtbarkeit ist hier nicht ausreichend.

Das Aufnehmen von `users` und `roles` erhöht die Sensibilität der Dump-Dateien deutlich, weil Auth-Daten, Rollenbezüge, Aktivstatus und Passwort-Hashes Bestandteil des Archivs werden können. Spätere Änderungen müssen daher Admin-Gates, Download-Schutz, Import-Bestätigung, Dateizugriff, Produktionszielprüfungen und Testabdeckung für unzulässige Rollen ausdrücklich berücksichtigen.

## Auswirkungen eines Eingriffs

Variante A macht den Dump/Import-Pfad robuster und betrieblich kontrollierbarer. Manuelle Dumps und Transfer-Artefakte würden nicht mehr unbegrenzt wachsen. Der Dump-Vertrag würde vollständiger, weil Benutzer und Rollen übertragen werden. Kritische Fehlerpfade beim Import würden transparenter und sicherer behandelt.

Bestehende scheduled Backups, CalDAV-Fallbacks und operative PDF-Ausgaben sollen fachlich unverändert bleiben. Datenbankschemaänderungen sind nach aktuellem Auftrag nicht vorgesehen.

## Risiken und Schadenspotential

Hoch. Dump/Import ist ein sensibler Admin-Pfad mit direktem Einfluss auf Datenbestand, Upload-Dateien, Benutzerzugänge und Rollen. Fehler könnten Backups unvollständig machen, Imports teilweise anwenden, Benutzerzugänge beschädigen, Rollen falsch zuordnen, Uploads inkonsistent wiederherstellen oder Dateien außerhalb des vorgesehenen Staging-Bereichs berühren.

Besonders kritisch sind die Nicht-Atomizität zwischen DB-Commit und Upload-Restore, Foreign-Key-Checks auf gepoolten Datenbankverbindungen und der Umgang mit Passwort-Hashes im Dump. Das Risiko muss durch kleine Umsetzungsschritte, gezielte Voranalyse, Tests mit echten ZIP-Dateioperationen und klare Fehlerprotokollierung begrenzt werden.

## Vorgeschlagene Maßnahme

Variante A bevorzugen, aber nur als separater, bewusst geplanter Hardening-Auftrag. Vor jeder Änderung ist der aktuelle Codezustand der betroffenen Dateien zu prüfen, weil der Auftrag selbst ausdrücklich davon ausgeht, dass sich die Lage seit der Analyse geändert haben kann.

Empfohlene Reihenfolge:

1. Dump-Vertrag prüfen und `roles`/`users` kontrolliert aufnehmen.
2. Retention für manuelle Dumps und Transfer-Artefakte in den bestehenden Scheduler integrieren.
3. Upload-Restore-Teilfehlerrisiko mit Design-Note, Journal-Information und Unit-Test absichern.
4. FK-Check-Reaktivierung so härten, dass keine Verbindung mit deaktivierten Checks in den Pool zurückkehrt.
5. Legacy-Importpfad `importDump` nur nach Nutzungsprüfung entfernen.
6. `stageUploads` mit einer `path.resolve`-basierten Boundary-Prüfung härten.
7. Tests für Retention, Dump-Vertrag, Import-Verifikation, Roundtrip und kritische Fehlerpfade ergänzen.

## Quelle

- Auftragsdatei vom 05.05.26: `C:\Users\r.rose\Downloads\codex-auftrag-ft07-dump-hardening.md`
