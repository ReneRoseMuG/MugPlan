# TEST_ISOLATION_REBUILD_PLAN

## Ziel

Dieses Dokument beschreibt das Prüf- und Regelwerk für einen späteren Umbau der Test-Isolation. Ziel ist eine deutlich schnellere Testausführung, ohne dass Integration- oder Browser-Tests still an Aussagekraft verlieren.

Der Umbau ist erst dann fachlich akzeptabel, wenn nachweisbar ausgeschlossen ist, dass Restdaten in Datenbank oder Storage, Seed-Vorbestand, Reihenfolgeeffekte oder unscharfe Assertions zu False Positives führen.

## Beobachteter Ist-Zustand

- `tests/setup.integration.ts` führt vor jedem Integration- und Vitest-E2E-Test `resetIsolatedTestStorage()`, `resetTestDataFactoryState()` und `resetDatabase()` aus.
- `tests/setup.env.ts` führt für Integration- und Vitest-E2E-Dateien ebenfalls einen Reset von DB und isoliertem Storage vor jedem Test aus.
- `tests/helpers/resetDatabase.ts` löscht alle Tabellen, stellt danach Systemrollen, `test-admin` und Default-Stammdaten wieder her. System-Seed wird nur bei explizitem Aufruf ergänzt.
- `tests/helpers/browserE2e.ts` setzt Browser-Suiten meist per `resetBrowserSuiteState()` auf DB-Reset plus System-Seed zurück. Der Helper setzt aber keinen eigenen Storage-Reset.
- `tests/helpers/testStorageIsolation.ts` stellt eine isolierte Temp-Storage-Umgebung bereit. Diese Isolation ist im Vitest-Pfad sichtbar verdrahtet, im Playwright-Pfad aber nicht gleichwertig abgesichert.
- Die Testlandschaft ist seriell und stark reset-lastig. Das schützt heute gut gegen Verschmutzung, kostet aber Laufzeit.

## Prüfziele

Das Prüfkonzept muss beim späteren Umbau mindestens folgende Risiken absichern:

| Risiko | Woran erkennbar | Wie prüfen |
|---|---|---|
| Restdaten in der DB erzeugen False Positives | Test findet Treffer ohne eigene Anlage oder findet mehr Daten als fachlich erzeugt wurden | Vorher-/Nachher-Counts, Token-/ID-Nachweis, Canary-Fremddaten |
| Restdaten im Storage erzeugen False Positives | UI oder Download zeigt Altdateien, alte Backups oder falsche Zähler | Storage-Fingerprint, leere Verzeichnisse prüfen, Storage-Canaries |
| Seed-Daten überdecken fehlende echte Testaktionen | Test besteht bereits mit vorhandenem System-Seed | Seed-Schatten-Canaries, Delta-Nachweis, explizite Nicht-Seed-Identität |
| Tests bestehen nur wegen unscharfer Assertions | `toContainText(...)` oder reine Sichtbarkeit reichen zufällig aus | Canary-Dubletten mit ähnlichen Namen, Identity- und Count-Prüfungen |
| Tests hängen von Ausführungsreihenfolge ab | Datei wird nur grün nach anderer Datei oder in bestimmter Reihenfolge | Permutationsläufe, Repeat-Läufe |
| Tests bestehen nur wegen Daten vorheriger Tests | Zweiter Lauf oder Mischlauf ändert Ergebnis | direkte Wiederholung derselben Datei, fachähnliche Suite-Mischläufe |
| Tests bestehen nur auf leerer DB ohne fachliche Notwendigkeit | Test schlägt nur bei harmlosem Fremdbestand fehl | Klasse-A-Ausnahme nur explizit, sonst Canary-Overlay |
| Browser-Tests lesen alte UI-Zustände | Listen, Hover oder Caches zeigen Altbestand statt neuem Ergebnis | Reload-/Refresh-Prüfung, Canary-Zeilen, Identity statt bloßer Textsichtbarkeit |

## Isolationsklassen

| Klasse | Bedeutung | Typische Merkmale | Hauptrisiko | Empfohlene Strategie |
|---|---|---|---|---|
| A | harte Isolation pro Test erforderlich | Mehrschrittige Mutationen, globale Zustände, Dump/Import, versions- oder konfliktkritische Flows | Vorläuferdaten verfälschen Ergebnis direkt | Restore oder Vollreset pro Test, Fingerprint vor jedem Test |
| B | Isolation pro Datei oder Suite ausreichend | Listen-, Filter-, Lese- und Vertrags-Suiten mit klar begrenztem Schreibbild | Fremddaten aus anderer Datei verfälschen Treffer | Restore pro Datei/Suite, Fingerprint pro Datei, Repeat-Lauf |
| C | Baseline pro Worker oder Lauf ausreichend | nur nach späterer Validierung für sehr stabile Read-Suiten | Cross-Suite-Leak bleibt unbemerkt | vorerst nicht breit nutzen; erst nach Pilot |
| S | Sonderfall für Seed-, Storage- oder Systemzustands-Abhängigkeit | Seed-Tests, Attachments, Backups, Dumps, Browser-Suites mit Uploads oder globalem Kontext | Seed- oder Storage-Restdaten täuschen echte Wirkung vor | eigener Fingerprint, meist pro Test oder pro Datei, zusätzliche Canaries |

## Suite-Matrix für den Pilot

| Datei | Isolation heute | Vorschlag | Seed | Storage | Risiko | Pilot-Grund |
|---|---|---|---|---|---|---|
| `tests/integration/server/projects.paged-list.integration.test.ts` | harter Reset pro Test | B / `core` | nein | nein | mittel | typische Listen- und Aggregationssuite |
| `tests/integration/server/tourWeekEmployees.integration.test.ts` | harter Reset pro Test | A / `core` | implizit systemnah | nein | hoch | komplexe Multistep-Suite mit direkter DB-Nähe |
| `tests/integration/server/admin.system-seed.integration.test.ts` | harter Reset pro Test | S / `core` | Ziel des Tests | nein | hoch | prüft Seed selbst, darf nicht vom Seed-Vorbestand profitieren |
| `tests/integration/server/appointments.attachments.integration.test.ts` | harter Reset pro Test | S / `core` | nein | uploads | hoch | echter Datei- und Legacy-Pfad-Flow |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | meist Reset+Seed pro Datei | B / `seeded` | ja | nein | mittel bis hoch | typische Browser-Listen- und Filterprüfung |
| `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` | Reset+Seed pro Datei | S / `seeded` | ja | backups | sehr hoch | Browser-Suite mit echtem Backup-Kontext |
| `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` | Reset+Seed pro Test | A / `seeded` | ja | nein | hoch | mehrschrittiger Browser-Workflow mit starken Seiteneffekten |

## Konkrete Pilot-Matrix

| Datei | Klasse | Baseline | Storage-Profil | Canary-Profil | Fingerprint vor Lauf | Alt-vs-Neu-Reihenfolge | Abbruchsignal |
|---|---|---|---|---|---|---|---|
| `tests/integration/server/projects.paged-list.integration.test.ts` | B | `core` | `none` | ähnliche Projektnamen, zusätzliche Auftragsnummer, zusätzlicher Termin im Zeitraum | `core` exakt | legacy -> candidate -> candidate+canary -> repeat -> Mischlauf mit `reports.auftragsliste` | abweichende `total`-/Paging-Werte oder falsche Treffer trotz Canary |
| `tests/integration/server/tourWeekEmployees.integration.test.ts` | A | `core` | `none` | zusätzlicher Mitarbeiter derselben KW, konkurrierende Tour, zusätzlicher Termin derselben Woche | `core` exakt vor jedem Test | legacy -> candidate -> candidate+canary -> repeat derselben Datei | neue Flakiness, andere Konflikt-/Preview-Ergebnisse oder grüne Läufe trotz Fremdzuordnung |
| `tests/integration/server/admin.system-seed.integration.test.ts` | S | `core` | `none` | seed-nahe Tour, seed-naher Tag, seed-nahe Notizvorlage | `core` exakt und `seeded` nur nach explizitem Seed-Aufruf | legacy -> candidate -> candidate+seed-canary -> repeat | Test besteht bereits wegen Vorbestand oder erzeugt Duplikate nicht mehr sichtbar |
| `tests/integration/server/appointments.attachments.integration.test.ts` | S | `core` | `uploads` | Alt-Attachment-Datei, zusätzliche Attachment-Zeile, Legacy-Pfad-Canary | `core` plus leeres Upload-Verzeichnis | legacy -> candidate -> candidate+storage-canary -> repeat | falscher Dateiname, falscher Download, falscher Count oder Altdatei sichtbar |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | B | `seeded` | `none` | ähnlicher Projektname, ähnlicher Kunde, zusätzlicher historischer Termin | `seeded` exakt | legacy -> candidate -> candidate+canary -> repeat -> Mischlauf mit `projects.filter-scopes` | unscharfer Texttreffer, falsche Zeilenzahl oder Scope-Toggle verdeckt Canary |
| `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` | S | `seeded` | `backups` | Alt-Backup-Datei, zusätzlicher Backup-Log, Fremd-Dump | `seeded` plus leeres Backup-Verzeichnis | legacy -> candidate -> candidate+storage-canary -> repeat | UI zeigt Altbestand, Counts ändern sich unkontrolliert oder Dump-/Backup-Liste ist nicht leer |
| `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` | A | `seeded` | `none` | zusätzlicher Mitarbeiter in derselben KW, fremde KW-Notiz, zusätzlicher Nachbarwochentermin | `seeded` exakt vor jedem Test | legacy -> candidate -> candidate+canary -> repeat derselben Datei | fremde Woche oder fremder Mitarbeiter wird fälschlich übernommen, Notizen/Counter leaken |

## Pilot-Reihenfolge

Die Pilotmigration soll in genau dieser Reihenfolge erfolgen:

1. `tests/integration/server/projects.paged-list.integration.test.ts`
2. `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
3. `tests/integration/server/appointments.attachments.integration.test.ts`
4. `tests/integration/server/admin.system-seed.integration.test.ts`
5. `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts`
6. `tests/integration/server/tourWeekEmployees.integration.test.ts`
7. `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`

Diese Reihenfolge startet absichtlich mit einer eher klar lesbaren Listen-/Filter-Suite, zieht dann Storage- und Seed-Sonderfälle vor und lässt die komplexesten Multistep-Suiten bis zuletzt stehen.

## Vergleichs- und Diagnose-Läufe pro Pilot

Für jede Pilot-Suite sind dieselben fünf Läufe verpflichtend:

1. `legacy-reset` ohne Canaries
2. `candidate-baseline` ohne Canaries
3. `candidate-baseline` mit passendem Canary-Profil
4. unmittelbarer Repeat-Lauf derselben Datei
5. Reihenfolge- oder Mischlauf mit fachähnlicher Vergleichssuite

Der Pilot ist nur bestanden, wenn:

- alle Pflichtläufe fachlich konsistent sind
- keine neue Flakiness nur im Kandidatenmodell auftritt
- Fingerprint und Storage-Ausgangszustand vor jedem Lauf nachweisbar stimmen
- Canaries mindestens einmal einen zu weichen Test sichtbar entlarven oder dokumentiert keine Angriffsfläche besteht

## Messpunkte je Pilot

Vor, während und nach jedem Pilot sind mindestens diese Daten festzuhalten:

- Laufzeit im Legacy-Modell
- Laufzeit im Kandidatenmodell
- Reset-Häufigkeit pro Datei
- Fingerprint-Status vor dem Lauf
- Ergebnis des Canary-Laufs
- Ergebnis des Repeat-Laufs
- Ergebnis des Reihenfolge- oder Mischlaufs
- Anzahl und Art aller Assertion-Nachschärfungen

## Was im Pilot ausdrücklich nicht erlaubt ist

- keine stille Abschwächung bestehender Assertions, nur damit das Kandidatenmodell grün wird
- keine Freigabe allein auf Basis eines grünen Kandidatenlaufs ohne Canary- und Reihenfolgenachweis
- keine Ausweitung auf Klasse `C` oder Worker-Isolation vor erfolgreichem Abschluss aller Pilot-Suiten

## Technische Folgeartefakte für den Implementierungsauftrag

### Geplante Fingerprint-Helfer

| Helper | Aufgabe | Erwarteter Input | Erwarteter Output |
|---|---|---|---|
| `assertDatabaseFingerprint(profile)` | prüft den DB-Ausgangszustand gegen `core` oder `seeded` | `core` oder `seeded` | Erfolg oder strukturierter Fehler mit Abweichungen |
| `assertStorageFingerprint(profile)` | prüft Upload-/Backup-Verzeichnisse gegen erwartete Leere oder erwarteten Sonderzustand | `none`, `uploads`, `backups`, `both` | Erfolg oder strukturierter Fehler mit gefundenen Restdateien |
| `assertCombinedTestFingerprint(config)` | kombiniert DB- und Storage-Prüfung für einen Testlauf | Baseline plus Storage-Profil | ein gemeinsamer Prüfstatus |
| `captureFingerprintSnapshot()` | erzeugt ein Diagnose-Snapshot für Reports und Alt-vs-Neu-Vergleich | optionales Profil | serialisierbarer Snapshot für Logs/Diagnose |

### Geplante Canary-Helfer

| Helper | Aufgabe | Erwarteter Input | Erwarteter Output |
|---|---|---|---|
| `injectDatabaseCanaries(profile, token)` | spielt definierte DB-Fremddaten für das gewählte Canary-Profil ein | Canary-Profil plus Lauf-Token | Liste der erzeugten Canary-Objekte |
| `injectStorageCanaries(profile, token)` | erzeugt Altdateien oder Altbackups im isolierten Storage | Storage-Canary-Profil plus Lauf-Token | Liste der erzeugten Dateien |
| `removeCanaries(token)` | räumt Canary-Daten gezielt wieder auf, falls ein Lauf dies verlangt | Lauf-Token | Erfolg oder strukturierter Fehler |
| `describeCanaryExpectation(profile)` | liefert für Diagnose- und Meta-Tests die erwarteten Störbilder | Canary-Profil | maschinen- und menschenlesbare Beschreibung |

### Geplante Diagnose- und Vergleichs-Helfer

| Helper | Aufgabe | Erwarteter Input | Erwarteter Output |
|---|---|---|---|
| `runSuiteUnderIsolationMode(mode, suite)` | führt eine Suite unter `legacy-reset` oder `candidate-baseline` aus | Modus plus Dateipfad | standardisierter Laufbericht |
| `compareIsolationRuns(legacy, candidate)` | vergleicht zwei Läufe nicht nur grün/rot, sondern fachlich | zwei Laufberichte | strukturierter Vergleich mit Abweichungsarten |
| `runRepeatSequence(suite, count)` | startet dieselbe Suite wiederholt zur Flaky- und Pollution-Erkennung | Dateipfad plus Wiederholungsanzahl | Sequenzbericht |
| `runPermutationSequence(suites)` | führt fachähnliche Suiten in definierter Reihenfolge aus | Liste von Dateipfaden | Reihenfolgebericht |

### Geplante Test-Metadaten

Für neue Integration- und Browser-Tests soll ein einheitliches Metadatenmodell vorgesehen werden:

| Feld | Bedeutung | Beispiel |
|---|---|---|
| `isolationClass` | benötigte Isolationsklasse | `A` |
| `baseline` | erwartete DB-Baseline | `seeded` |
| `storageProfile` | benötigter Storage-Ausgangszustand | `uploads` |
| `canaryProfile` | Canary-Typ für Diagnose-Läufe | `attachment-confusion` |
| `requiresNegativeProof` | Negativnachweis verpflichtend | `true` |

Diese Metadaten können zunächst im Test-Scope-Kommentar dokumentiert und später über einen Helper oder ein Wrapper-API formalisiert werden.

## Konkreter Zuschnitt für den nächsten Implementierungsauftrag

Der nächste Implementierungsauftrag sollte in genau dieser Reihenfolge geschnitten werden:

1. Fingerprint-Helfer für `core`, `seeded` und Storage-Leere bauen
2. Browser-Storage-Isolation technisch mit dem Vitest-Pfad gleichziehen
3. Canary-Helfer für die Pilot-Profile einführen
4. einen Vergleichs-Runner für `legacy-reset` gegen `candidate-baseline` bereitstellen
5. erst danach die Pilot-Suiten nacheinander auf das Kandidatenmodell heben

Nicht in denselben Auftrag ziehen:

- Worker-Parallelisierung
- breite Migration aller Suiten
- pauschales Nachschärfen vieler Assertions ohne vorherigen Canary- oder Vergleichsbefund
- Umbauten an Produktivlogik außerhalb der Test-Infrastruktur

## Konkrete nächste Schritte

### Als Erstes umsetzen

1. DB- und Storage-Fingerprint-Helfer für `core`, `seeded` und leere Upload-/Backup-Pfade
2. gleichwertige Browser-Storage-Isolation für den Playwright-Pfad
3. Canary-Helfer für die in der Pilot-Matrix definierten Profile
4. Vergleichs- und Diagnose-Läufe für `legacy-reset` gegen `candidate-baseline`
5. erst danach die Pilot-Suiten in der definierten Reihenfolge

### Auf keinen Fall als Erstes umsetzen

- keine Worker-Parallelisierung
- keine globale Umstellung aller Reset-Hooks
- keine breite Migration vieler Suites in einem Big-Bang
- keine Assertion-Abschwächungen, nur damit das neue Modell grün wird
- keine produktive Fachlogikänderung als Nebenwirkung der Testbeschleunigung

### Messpunkte vor jeder Umbauphase

- aktuelle Laufzeit der betroffenen Suite im Legacy-Modell
- Anzahl der Resets pro Datei und pro Test
- erwarteter Fingerprint vor Start der Phase
- erwarteter Storage-Zustand vor Start der Phase
- Ergebnis des Alt-vs-Neu-Vergleichs
- Ergebnis des Canary-Laufs
- Ergebnis des Repeat-Laufs
- Ergebnis des Reihenfolge- oder Mischlaufs
- dokumentierte Assertion-Nachschärfungen mit Begründung

## Canary-Katalog

| Kategorie | Ziel | Testarten | Erwarteter Fehlertyp bei zu schwachen Tests |
|---|---|---|---|
| ähnlicher Kundenname | unscharfe Textsuche und falsche Treffermenge sichtbar machen | Integration, Browser | falscher Treffer über `toContainText`, fehlender Identitätsnachweis |
| ähnlicher Projektname mit anderer Auftragsnummer | Filter- und Listenfehler sichtbar machen | Integration, Browser | falscher Listentreffer, falsche Sortierung oder falscher Count |
| zusätzlicher Termin im selben Zeitraum | zeitbasierte Listen- und Kalenderfehler sichtbar machen | Integration, Browser | falsches `rows.first()`, falsche Anzahl, falsche Bereichsgrenzen |
| zusätzlicher Mitarbeiter in derselben Tour oder ohne Tour | Scope-Leaks sichtbar machen | Integration, Browser | falsche Zuordnung in Lane, Tabelle oder Wochenplanung |
| Seed-nahe Tour/Tag/Notizvorlage | Seed-Verwechslung sichtbar machen | Integration, Browser, Seed-Suiten | Test besteht bereits auf vorhandenem Systemobjekt |
| zusätzliche Tags, Notizen oder Attachments | Aggregations- und Context-Leaks sichtbar machen | Integration, Browser, Storage-Suiten | falscher Counter, falscher Hover-/Preview-Inhalt |
| Storage-Canary-Datei oder Alt-Backup | Storage-Leaks sichtbar machen | Browser, Integration mit Upload/Backup/Dump | UI oder Download liest Altbestand statt Testobjekt |

### Technische Einspeisung der Canaries

- DB-Canaries werden gezielt vor dem eigentlichen Testlauf in derselben Baseline ergänzt.
- Storage-Canaries werden in den isolierten Upload-/Backup-Pfaden angelegt.
- Canaries laufen nur in Diagnose-, Meta- oder Pilot-Läufen, nicht im normalen Green-Run.
- Jede Canary erhält einen klaren Token, damit Tests explizit das Zielobjekt von den Fremddaten trennen können.

### Ein Test, der an Canaries scheitern muss

- Ein Browser-Test, der nach Erzeugung eines Projekts nur `toContainText("Projekt A")` prüft, muss scheitern, wenn bereits ein Canary-Projekt `Projekt A Altbestand` existiert.
- Ein Integrationstest, der nur `total > 0` statt `total === 1` prüft, muss scheitern, wenn ein zusätzliches Canary-Objekt denselben Filter bedient.
- Ein Attachment-Test, der nur auf sichtbaren Dateinamen prüft, muss scheitern, wenn im Storage bereits eine Altdatei mit ähnlichem Namen liegt.

## Baseline-Fingerprints

### `core`

- Rollen: exakt `ADMIN`, `READER`, `DISPATCHER`
- Benutzer: `test-admin` vorhanden
- Default-Stammdaten: Produktkategorie `Fass Saunen` vorhanden
- Fachtabellen wie `customers`, `projects`, `appointments`, Join-Tabellen, Notes und Attachments leer
- Upload- und Backup-Verzeichnisse leer

### `seeded`

- kompletter `core`-Fingerprint
- System-Tags vorhanden
- System-Touren vorhanden
- System-Notizvorlagen vorhanden
- sonst keine zusätzlichen Fachdatensätze
- Upload- und Backup-Verzeichnisse leer

Ein Reset oder Restore gilt nur dann als gültig, wenn der erwartete Fingerprint aktiv geprüft und bestätigt wurde.

## Alt-vs-Neu-Validierung

- Jeder Pilot läuft unter zwei Modellen:
  - `legacy-reset`
  - `candidate-baseline`
- Pflichtvergleich pro Pilot:
  - normaler Lauf
  - Lauf mit Canaries
  - direkter Repeat-Lauf
  - Lauf in geänderter Reihenfolge zusammen mit fachähnlicher Suite
- Kritische Abweichungen:
  - neu grün, alt rot
  - neu grün nur ohne Fingerprint
  - neu grün trotz Canary, die sichtbar sein müsste
  - neue Flakiness nur im Kandidatenmodell

## Reihenfolge- und Wiederholungssicherheit

Pflichtläufe für Piloten:

1. dieselbe Datei direkt mehrfach hintereinander
2. fachähnliche Dateien in invertierter Reihenfolge
3. Mischlauf mehrerer Listen-/Filter-/Report-Suiten
4. Läufe ohne Zwischenreset nur dort, wo das neue Modell dies ausdrücklich vorsieht

Diese Läufe sollen Defekte durch Vorläuferdaten, implizite Abhängigkeiten und Cache-/Storage-Leaks sichtbar machen.

## Negative Nachweise

Kritische Tests müssen zusätzlich zeigen, dass etwas nicht passiert ist:

- kein alter Datensatz wurde getroffen
- kein Seed-Datensatz wurde verwechselt
- kein Storage-Altbestand wurde gelesen
- kein zusätzlicher Canary-Treffer blieb unbemerkt
- die Delta-Menge ist exakt wie erwartet, nicht nur "größer als null"

Reine Existenzprüfung reicht bei Listen-, Filter-, Report-, CRUD- und Browser-Reopen-Flows nicht aus.

## Regeln für robuste künftige Tests

### Testdaten-Eindeutigkeit

- Neue Integration- und Browser-Tests müssen eindeutige Testdaten-Tokens verwenden, wenn Verwechslungen möglich sind.
- Die Kennung muss pro Test oder pro Datei eindeutig sein, sobald Listen, Filter, Suche, Reihenfolge oder Seed-Nähe eine Verwechslung erlauben.
- Bestehende generische Namen dürfen nicht blind kopiert werden.

### Robuste Assertions

- Reine Textprüfung ist zu schwach, wenn mehrere fachlich ähnliche Objekte existieren können.
- In Listen, Tabellen, Overlays, Reports und Reopen-Flows sind zusätzlich Count-, Identity-, Filter- oder Delta-Prüfungen zu verwenden.
- Neu erzeugte Datensätze müssen über ID, Token oder eindeutige Kombinationen identifiziert werden.
- Bei kritischen Pfaden ist zusätzlich zu prüfen, dass alte Datensätze gerade nicht gemeint sein können.

### Umgang mit Seed-Daten

- Seed-Daten sind nur zulässig, wenn der Test klar beschreibt, dass er auf einer `seeded`-Baseline arbeitet.
- Der Test muss bei eigener Mutation zusätzlich nachweisen, dass seine Aktion wirksam war und nicht nur vorhandenen Seed sichtbar gemacht hat.
- Seed-nahe Namen dürfen nicht als alleiniger Erfolgsausweis dienen.

### Umgang mit Listen und UI

- Browser-Tests dürfen Listen nicht nur über `toContainText(...)` oder reine Sichtbarkeit absichern.
- Nach Mutationen sind Identität, Reihenfolge, Anzahl oder Filterzustand mitzubelegen.
- Hover-, Sidebar-, Preview- und Cache-Tests müssen zeigen, dass der neue Stand geladen wurde und nicht Altbestand oder Canary-Daten.

### Negativprüfungen

- Wenn Fremddaten ein False Positive erzeugen könnten, ist eine Negativprüfung Pflicht.
- Vorher-/Nachher-Prüfungen sind notwendig, sobald ein Test neue Datensätze anlegt, ersetzt, filtert oder ausblendet.
- Reine Existenzprüfung reicht nicht bei kritischen CRUD-, Listen-, Storage- und Seed-Pfaden.

### Isolation bewusst deklarieren

- Jeder neue Integration- oder Browser-Test muss seine benötigte Isolation explizit deklarieren:
  - Isolationsklasse: `A`, `B`, `C` oder `S`
  - Baseline: `core` oder `seeded`
  - Storage-Bedarf: `none`, `uploads`, `backups` oder `both`
- Diese Deklaration soll im Test-Scope-Kommentar oder über einen künftigen Helper sichtbar sein.

### Laufzeitbewusste Testkonstruktion

- Neue Tests sollen die schnellste fachlich noch korrekte Isolationsstufe wählen und nicht vorsorglich auf härtere Resets ausweichen.
- `seeded` ist keine bequeme Voreinstellung, sondern nur zulässig, wenn der Test tatsächlich System-Seed oder systemnahe Masterdaten braucht.
- `per-test` ist nur für echte Klasse-A- oder Klasse-S-Fälle zulässig; Klasse-B-Suiten sollen zuerst gegen `per-suite` entworfen werden.
- Bereits vorhandene Registry-Einträge, Suite-Helfer und Baselines sind wiederzuverwenden, bevor neue Sonderpfade eingeführt werden.
- Wiederholte Logins, Navigationen, Seeds oder Helper-Aufbauten innerhalb derselben Suite sind nur zulässig, wenn der fachliche Nachweis sonst verloren ginge.
- Ein neuer Test gilt nicht als gut konstruiert, wenn er zwar korrekt, aber unnötig teuer ist.

### Verbindliche Entwurfs-Checkliste für neue Tests

Vor der Anlage eines neuen Integration- oder Browser-Tests ist mindestens diese Abwägung zu treffen:

1. Welche minimale Isolationsklasse deckt den Test noch korrekt ab?
2. Welche minimale Baseline deckt den Test noch korrekt ab?
3. Kann derselbe Nachweis mit `per-suite` statt `per-test` geführt werden?
4. Welcher vorhandene Registry- oder Helper-Pfad ist wiederverwendbar?
5. Welche konkrete Assertion verhindert False Positives durch Seed, Restdaten oder ähnliche Namen?
6. Welche Entwurfsalternative wäre schneller gewesen und warum reicht sie fachlich nicht?

Wenn diese Fragen nicht beantwortet werden können, ist der Test noch nicht reif für die Umsetzung.

## Zielarchitektur für den späteren Umbau

- `core`- und `seeded`-Baselines als explizite Ausgangszustände
- harte Isolation nur noch für Klasse A und S
- Datei-/Suite-Isolation für ausgewählte Klasse-B-Suiten
- Storage-Isolation als eigener Pflichtbaustein, besonders für Browser-Suiten
- Canaries und Fingerprints als Diagnose- und Freigabemechanismus
- Worker-Isolation erst nach erfolgreichem Pilot, nicht in Phase 1

## Migrationsplan in kleinen Schritten

1. nur messen und klassifizieren
2. nur Fingerprints, Canaries und Validierungsnetz einbauen
3. wenige Pilot-Suiten unter Alt-vs-Neu-Vergleich umstellen
4. kontrollierte Ausweitung auf weitere Klasse-B-Suiten
5. erst danach breiter Rollout und spätere Worker-Isolation

Jede Phase ist abzubrechen, wenn Fingerprints instabil sind, Canaries nicht anschlagen, neue Flakiness entsteht oder Assertions nur durch Abschwächung grün gehalten werden könnten.

## Offene Restrisiken

- Browser-Storage ist heute nicht gleichwertig isoliert wie der Vitest-Pfad und bleibt bis zur technischen Schließung ein echter Risikopunkt.
- Einige bestehende Tests verwenden bereits weiche Muster; diese müssen beim Pilot aktiv identifiziert und nicht still übernommen werden.
- Dump-, Backup- und andere globale Systemzustands-Suiten bleiben teuer und sollen zuerst sicher, nicht maximal schnell werden.
- Klasse C und Worker-Isolation sind vor erfolgreicher Pilotvalidierung bewusst ausgeschlossen.
 
## Konsolidierter Pilotstand

| Suite | Klasse | Baseline | Reset-Scope | Canary | Status | Ergebnis | Konsequenz |
|---|---|---|---|---|---|---|---|
| `tests/integration/server/projects.paged-list.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | legacy, candidate, repeat und Canary gruen | erste `candidate-default`-Suite |
| `tests/integration/server/customers.paged-list.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Canary-Fund im Paging gehaertet, danach stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/appointments.list.sorting.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | legacy, candidate, repeat und Canary fuer Sortierung/OrderNumber stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/projects.scope.mengenlogik.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Scope-Partition all/withAppointments/upcoming/noAppointments unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Customer-, Employee- und Project-Preview unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/appointments.direct-projections.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Direkttermine in Listen-, Kalender- und Delete-Projektionen unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/reports.auftragsliste.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Auftragsliste unter legacy, candidate, repeat und Canary fuer Kategorienfilter, Reklamationsausschluss und Storno-Fallback stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/reports.vorlaufliste.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Vorlaufliste nach Idempotenz-Haertung fuer wiederholte Artikel- und Rollenfixtures unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Druckvorschau unter legacy, candidate, repeat und Canary fuer Vollmenge und Listenparitaet stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/appointments.tour-change-preview.integration.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Tour-Change-Preview unter legacy, candidate, repeat und Canary fuer KW-Wechsel und spaetere Tourzuordnung stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/masterData.visibility.by-role.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Masterdata-Sichtbarkeit unter legacy, candidate, repeat und Canary fuer Rollenfilter und Aktiv-Defaults stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/customers.visibility.by-role.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Kunden-Sichtbarkeit nach monotone Credentials- und Kundennummern-Haertung unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/employees.visibility.by-role.test.ts` | B | `core` | `per-suite` | `project-list-confusion` | validiert | Mitarbeiter-Sichtbarkeit nach monotone Credentials-Haertung unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/integration/server/appointments.attachments.integration.test.ts` | S | `core` | `per-test` | `attachment-confusion` | validiert mit harter Isolation | Storage-Pilot stabil gruen | bleibt vorerst `pilot-only` |
| `tests/integration/server/admin.system-seed.integration.test.ts` | S | `core` | `per-test` | `seed-shadow` | validiert mit harter Isolation | `per-suite` ungeeignet, `per-test` stabil | bleibt vorerst `pilot-only` |
| `tests/integration/server/tourWeekEmployees.integration.test.ts` | A | `core` | `per-test` | `week-plan-confusion` | validiert mit harter Isolation | Canary-Fund behoben, danach stabil | bleibt vorerst `pilot-only` |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | Canary-Fund im Listenreset behoben | zweite `candidate-default`-Suite |
| `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | seeded Browser-Scope-Pilot ohne Nachschärfung stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset plus legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Navigation unter legacy, candidate, repeat und Canary stabil, ohne relevante Canary-Angriffsfläche | weitere `candidate-default`-Suite |
| `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | Settings-Persistenz unter legacy, candidate, repeat und Canary stabil, ohne relevante Canary-Angriffsfläche | weitere `candidate-default`-Suite |
| `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | Filter- und Scope-Persistenz unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Inline- und Standalone-Reportausgaben unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/standalone-routing.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Navigation, Popup-Flows und Edit-Rueckwege unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Tour-/Mitarbeiter-Terminliste unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Monatsuebersicht unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; FT26-Reportfluss unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Tourenplan-Vorschau und Browser-Print unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/refresh-button.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Refresh in Haupt- und Standalone-Views unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts` | B | `seeded` | `per-suite` | `project-list-confusion` | validiert | echter Suite-Pfad im Reset; Picker-, Filter- und Wochenkartenfluss unter legacy, candidate, repeat und Canary stabil | weitere `candidate-default`-Suite |
| `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` | S | `seeded` | `per-suite` | `backup-confusion` | validiert | Browser-Backup-Pilot stabil gruen | bleibt vorerst `pilot-only` |
| `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` | A | `seeded` | `per-test` | `week-plan-confusion` | validiert mit harter Isolation | komplexer Browser-Wochenplan stabil | bleibt vorerst `pilot-only` |

## Zielzuordnung nach Pilot

Nur Suiten, die unter `candidate-baseline` mit `per-suite` sowie Canary und Repeat stabil validiert wurden, duerfen in den normalen Default-Rollout wechseln.

### `candidate-default`

- `tests/integration/server/projects.paged-list.integration.test.ts`
- `tests/integration/server/customers.paged-list.integration.test.ts`
- `tests/integration/server/appointments.list.sorting.integration.test.ts`
- `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`
- `tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts`
- `tests/integration/server/appointments.direct-projections.integration.test.ts`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`
- `tests/integration/server/appointments.tour-change-preview.integration.test.ts`
- `tests/integration/server/masterData.visibility.by-role.test.ts`
- `tests/integration/server/customers.visibility.by-role.test.ts`
- `tests/integration/server/employees.visibility.by-role.test.ts`
- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts`
- `tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts`
- `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts`
- `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts`
- `tests/e2e-browser/standalone-routing.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts`
- `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`
- `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts`
- `tests/e2e-browser/refresh-button.browser.e2e.spec.ts`
- `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`

### `pilot-only`

- `tests/integration/server/appointments.attachments.integration.test.ts`
- `tests/integration/server/admin.system-seed.integration.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`

Diese Trennung ist bewusst konservativ: Ein bestandener Pilot genuegt noch nicht fuer einen breiten Default-Rollout, wenn die Suite harte Isolation, Seed-Sonderbehandlung oder Storage-Schutz braucht.

## Kontrollierter Umbau ab diesem Stand

Der Umbau startet ab jetzt nicht mehr nur ueber manuelle Pilot-Flags, sondern ueber eine feste Registry der bereits validierten Suites.

- Die Registry bildet Klasse, Baseline, Storage-Profil, Reset-Scope, Canary-Profil und Rollout-Modus pro pilotierter Suite ab.
- Ohne explizite Env-Overrides schalten nur explizit freigegebene `candidate-default`-Suites automatisch auf `candidate-baseline`.
- Alle anderen pilotierten Suites bleiben `pilot-only` und laufen im normalen Standard weiter im Legacy-Modell.
- Jede weitere Suite darf erst dann in `candidate-default` wechseln, wenn Canary-, Repeat- und Vergleichslaeufe dokumentiert gruen sind und keine Assertion-Abschwaechung noetig war.
