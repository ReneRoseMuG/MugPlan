# FT (07): Automatisierte Datensicherung und Fallback

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Sicherstellung der operativen Handlungsfähigkeit bei Systemausfällen durch zwei unabhängige Sicherungsebenen: einen täglichen vollständigen Datenbankdump als primäre Datensicherung sowie ein ereignisgetriebenes PDF-Dokument „Anstehende Termine" als operative Kurzübersicht. Ergänzend erfolgt eine optionale Synchronisation mit einem externen CalDAV-Kalender als zusätzliche Anzeige- und Ausfallsicherung.

## Fachliche Beschreibung

Das System erzeugt ereignisgetrieben ein PDF-Dokument „Anstehende Termine", sobald ein Termin neu angelegt oder geändert wird.

Das PDF enthält alle Termine ab dem heutigen Tag, sortiert nach Datum und Uhrzeit. Vergangene Termine werden nicht aufgenommen.

Jeder Termin wird als visuell abgegrenzter horizontaler Abschnitt dargestellt. Der Abschnitt gliedert sich in zwei Bereiche:

**Kopfzeile** (immer vorhanden):
Uhrzeit (sofern erfasst), Datum, Kundennummer, vollständiger Kundenname, Auftragsnummer des Projekts.

**Detailbereich** (nur wenn eine Auftragsnummer vorhanden ist):
Eingerückt unter der Kopfzeile: die Artikelliste des Projekts sowie die Anmerkungen aus der Projektbeschreibung.

Die Abschnitte werden durch eine klare visuelle Trennung voneinander abgegrenzt. Die Darstellung muss auch bei ca. 200 Terminen übersichtlich und gut lesbar sein.

Das Dokument wird serverseitig gespeichert und im Backup-Log protokolliert. Ein Administrator kann vergangene Dokumente einsehen und herunterladen.

Backups älter als 30 Tage werden automatisch gelöscht. Logeinträge bleiben dauerhaft erhalten.

Unabhängig vom PDF erzeugt das System täglich einen vollständigen Datenbankdump. Der Dump wird als ZIP-Archiv gespeichert, das eine strukturierte JSON-Exportdatei, ein Manifest und den Anhang-Ordner enthält. Format und Struktur entsprechen dem internen Dump-Format `formatVersion 3` und ermöglichen einen vollständigen Datenimport in eine andere Instanz. Der Dump enthält auch Benutzerkonten mit Passwort-Hashes, 2FA-Feldern und Aktivstatus; Rollen werden nicht als rohe Tabelleninhalte übertragen, sondern über stabile `roleCode`-Werte gegen die lokalen Systemrollen gemappt. Dumps älter als 30 Tage werden automatisch gelöscht. Ein Administrator kann vorhandene Dumps einsehen, herunterladen, als Import vorprüfen und nach Sicherheitsbestätigung einspielen. Der Dump-Prozess darf die normale Systemfunktion nicht blockieren; Fehler werden protokolliert.

Zusätzlich synchronisiert das System Termine mit einem externen CalDAV-Kalender (Nextcloud). Die Synchronisation erfolgt ereignisgetrieben bei Termin-Neuanlage, -Änderung und -Löschung, serverseitig, nicht blockierend und ausschließlich vom System zum externen Kalender. Der externe Kalender dient als zusätzliche Anzeige- und Fallback-Instanz und ist kein führendes System.

## Regeln & Randbedingungen

- Das PDF wird bei jeder Termin-Neuanlage und bei jeder Terminänderung neu erzeugt.
- Das PDF enthält ausschließlich Termine ab dem heutigen Tag (heute inklusive), sortiert aufsteigend nach Datum, dann nach Uhrzeit.
- Termine ohne Uhrzeit werden innerhalb ihres Datums vor Terminen mit Uhrzeit einsortiert.
- Jeder Termin wird als eigener horizontaler Abschnitt dargestellt, visuell klar von den benachbarten Abschnitten getrennt.
- Die Kopfzeile jedes Abschnitts enthält: Uhrzeit (nur wenn erfasst), Datum, Kundennummer, vollständiger Kundenname, Auftragsnummer.
- Der Detailbereich wird nur gerendert, wenn eine Auftragsnummer vorhanden ist. Er enthält eingerückt: die Artikelliste des Projekts sowie die Anmerkungen aus der Projektbeschreibung.
- Das Dokument wird serverseitig gespeichert und im Backup-Log protokolliert.
- Ein Administrator kann vergangene Dokumente über die Backup-Historie einsehen und herunterladen.
- Dokumente älter als 30 Tage werden automatisch gelöscht. Logeinträge bleiben dauerhaft erhalten.
- Monitoring und Download sind ausschließlich für Administratoren sichtbar.
- Es wird genau ein CalDAV-Kalender synchronisiert.
- Die CalDAV-Synchronisation erfolgt bei Termin-Neuanlage, -Änderung und -Löschung.
- Der externe Kalender ist nicht führend. Es erfolgt keine Rücksynchronisation. Externe Änderungen werden bei nächster Aktualisierung überschrieben.
- Jeder Termin besitzt eine stabile externe UID, die sich niemals ändert.
- Synchronisationsfehler dürfen die Termin-Speicherung nicht blockieren. Fehler werden protokolliert.
- Authentifizierung erfolgt über Nextcloud-App-Passwort. Kommunikation ausschließlich über HTTPS. CalDAV-Zugangsdaten werden über Umgebungsvariablen konfiguriert.
- Das System erzeugt täglich automatisch einen vollständigen Datenbankdump (Scheduler, täglich 02:00 Uhr Europe/Berlin).
- Der Dump wird als ZIP-Archiv gespeichert und enthält `data.json`, `manifest.json` sowie den Anhang-Ordner.
- Der Dump enthält die Anwendungstabellen einschließlich `users`; `roles` bleibt seed-geführte Systemtabelle und wird beim Import über `roleCode` auf die lokale Rollen-ID gemappt.
- Dump-Dateien enthalten sensible Auth-Daten wie Passwort-Hashes und 2FA-Zustände. Download, Preview und Import sind ausschließlich für Administratoren zulässig.
- Dumps, manuelle Dump-Dateien und Transfer-Artefakte werden nach demselben Retention-Prinzip wie PDF-Backups behandelt: Dateien beziehungsweise Tagesverzeichnisse älter als 30 Tage werden automatisch gelöscht, Logeinträge bleiben dauerhaft erhalten.
- Der Import prüft das Archiv zunächst über Preview auf ZIP-Lesbarkeit, Manifest, Tabellen- und Upload-Prüfsummen sowie blockierende Sicherheitsregeln. Der eigentliche Apply-Import bleibt ein separater destruktiver Admin-Schritt mit Sicherheitsbestätigung.
- Ein echter DB-Dry-Run gegen isolierte Zusatzdatenbanken ist als offene Erweiterung dokumentiert und noch nicht Bestandteil des aktuellen Importpfads.
- Der Dump-Prozess darf laufende Systemoperationen nicht blockieren. Fehler werden protokolliert, ohne den normalen Betrieb zu unterbrechen.
- Monitoring, Download, Preview und Import von Dumps sind ausschließlich für Administratoren zugänglich.

---

## Use Cases

- [UC 07/03: PDF „Anstehende Termine“ erzeugen](use-cases/uc-07-03-pdf-anstehende-termine-erzeugen.md)
- [UC 07/05: Backup-Historie einsehen](use-cases/uc-07-05-backup-historie-einsehen.md)
- [UC 07/06: Backup herunterladen](use-cases/uc-07-06-backup-herunterladen.md)
- [UC 07/07: Alte Backups automatisch löschen](use-cases/uc-07-07-alte-backups-automatisch-loeschen.md)
- [UC 07/08: Termin in externen Kalender übertragen](use-cases/uc-07-08-termin-in-externen-kalender-uebertragen.md)
- [UC 07/09: Synchronisationsfehler protokollieren](use-cases/uc-07-09-synchronisationsfehler-protokollieren.md)
- [UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren](use-cases/uc-07-10-terminaenderung-im-caldav-kalender-aktualisieren.md)
- [UC 07/11: Termin im CalDAV-Kalender löschen](use-cases/uc-07-11-termin-im-caldav-kalender-loeschen.md)
- [UC 07/12: DB-Dump automatisch erzeugen](use-cases/uc-07-12-db-dump-automatisch-erzeugen.md)
- [UC 07/13: DB-Dump herunterladen](use-cases/uc-07-13-db-dump-herunterladen.md)
- [UC 07/14: DB-Dump importieren](use-cases/uc-07-14-db-dump-importieren.md)

## Backlogs

- [E-Mail-Versand nach Backup-Lauf](backlog/ft-07-automatisierte-datensicherung-und-fallback-backlog.md)
- [Backup Cloud Sync](backlog/ft-07-automatisierte-datensicherung-und-fallback-backlog.md)

## Architektur & Kontext


## Entscheidungen & Offene Punkte

- [W-22: Echter DB-Dry-Run für Dump-Import](../../decisions/w-22-ft07-db-dry-run-dump-import.md)
