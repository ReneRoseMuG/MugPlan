# Änderungsnachweise (konsolidiert)

Stand: 2026-02-07
Quelle: aktueller Diff-Stand von `.ai/architecture.md` und `.ai/implementation.md`.

## 1) Rollenherkunft und `x-user-role` als nicht-autoritatives Signal

- **Datei/Anker:** `.ai/architecture.md:133`, `.ai/architecture.md:441`, `.ai/architecture.md:199`
- **Vorher (kompakt):** Rolleninformation wurde teils als requestweiser Header-Transport beschrieben.
- **Nachher (kompakt):** Autoritative Rollenquelle ist serverseitig `users -> roles`; `x-user-role` ist nur Dev-/Simulationssignal, nicht für Berechtigungs-/Sicherheitsentscheidungen.

- **Datei/Anker:** `.ai/implementation.md:97`, `.ai/implementation.md:315`
- **Vorher (kompakt):** Rollen-/Kontextbezug im Kalender war missverständlich als Request-Kontext formuliert.
- **Nachher (kompakt):** Klarstellung: `x-user-role` ist nicht autoritativ; im Kalender derzeit keine belastbare serverseitige Rollenbegrenzung, solange Entscheidungen darauf beruhen.

## 2) Übergangs-UserId (`SETTINGS_USER_ID`) korrekt eingeordnet

- **Datei/Anker:** `.ai/architecture.md:731`, `.ai/architecture.md:733`
- **Vorher (kompakt):** Übergangssetzung von `req.userId` beschrieben, Sicherheitsabgrenzung nicht vollständig präzisiert.
- **Nachher (kompakt):** `SETTINGS_USER_ID` ist Entwicklungs-/Übergangsmechanismus, ersetzt keine Auth/Session; Rollenauflösung für Settings bleibt DB-autoritativ.

- **Datei/Anker:** `.ai/implementation.md:311`, `.ai/implementation.md:313`
- **Vorher (kompakt):** Übergang erwähnt, Bedeutung von „serverseitig" konnte überinterpretiert werden.
- **Nachher (kompakt):** Präzisierung identisch zur Architektur: Identitätsinput nur Übergang; Rollenquelle DB-autoritativ, nicht gleichbedeutend mit voll authentifizierter Session.

## 3) Controller-Leitlinie: JSON vs. Multipart-Sonderfall

- **Datei/Anker:** `.ai/architecture.md:95`, `.ai/architecture.md:577`, `.ai/architecture.md:591`
- **Vorher (kompakt):** Parsing/Validierung im Controller teils absolut über Contracts formuliert.
- **Nachher (kompakt):** JSON über Contracts; Multipart (Uploads) als definierter Sonderfall mit Parser/Limits, bei einheitlichen Fehlerformaten/Grenzwerten/Schichtgrenzen.

- **Datei/Anker:** `.ai/implementation.md:33`, `.ai/implementation.md:39`, `.ai/implementation.md:63`
- **Vorher (kompakt):** Absolute Contract-Formulierung ohne klaren Multipart-Sonderfall.
- **Nachher (kompakt):** Konsistente Zweiteilung JSON-Contract-Parsing vs. Multipart-Parser mit Limits.

## 4) Persistenz-Stack klar und konsistent (MySQL + Drizzle + mysql2)

- **Datei/Anker:** `.ai/architecture.md:541`, `.ai/architecture.md:547`
- **Vorher (kompakt):** Relativierung/Inkonsistenzhinweis zur DB-Technologie im aktuellen Ist-Stand.
- **Nachher (kompakt):** Ist-Stand explizit: MySQL-basierter Persistenzstack mit Drizzle ORM und mysql2; historische Relativierungen getrennt.

- **Datei/Anker:** `.ai/implementation.md:25`
- **Vorher/Nachher:** Bereits konsistent, unverändert als Referenz-Iststand genutzt.

## 5) Query-Keys außerhalb Kalender: Ist-Stand präzisiert

- **Datei/Anker:** `.ai/architecture.md:547`
- **Vorher (kompakt):** Außerhalb Kalender keine zentrale/extrahierbare Sicht formuliert.
- **Nachher (kompakt):** Präzisiert: kein vollständiger zentraler Index, aber mindestens im Attachments-Wrapper-Pattern bereits stabile Query-Keys vorhanden.

- **Datei/Anker:** `.ai/implementation.md:404`, `.ai/implementation.md:561`
- **Vorher/Nachher:** Bestehende Attachments-Wrapper-Aussagen bleiben Referenz; kein inhaltlicher Widerspruch mehr zur Architektur.

## 6) Attachments Delete-Policy harmonisiert

- **Datei/Anker:** `.ai/architecture.md:356`
- **Vorher (kompakt):** `DELETE /api/project-attachments/:id` nur als Endpunkt gelistet.
- **Nachher (kompakt):** Explizit als absichtlich blockiert (`405`) gekennzeichnet.

- **Datei/Anker:** `.ai/implementation.md:469`
- **Vorher (kompakt):** Blockiert ohne Statuscode.
- **Nachher (kompakt):** Blockierung mit explizitem `405`.

## 7) Mitarbeiter-Überschneidung: Zielregel vs. verifizierter Ist-Stand

- **Datei/Anker:** `.ai/architecture.md:75`, `.ai/architecture.md:269`, `.ai/architecture.md:573`
- **Vorher (kompakt):** Teilweise als gesichert serverseitig blockierend dargestellt.
- **Nachher (kompakt):** Hard-Rule bleibt fachlich verbindlich, aber serverseitige Konfliktblockierung im Ist-Stand als nicht zuverlässig verifiziert / nicht eindeutig vollständig umgesetzt gekennzeichnet.

- **Datei/Anker:** `.ai/implementation.md:91`, `.ai/implementation.md:93`
- **Vorher (kompakt):** Konfliktblockierung nicht transparent genug abgegrenzt.
- **Nachher (kompakt):** Gegencheck-Transparenz ergänzt; separate Implementations-/Refactoring-Aufgabe zur belastbaren serverseitigen Absicherung benannt.

## 8) Settings-Persistenzmodell explizit gemacht

- **Datei/Anker:** `.ai/implementation.md:183`, `.ai/implementation.md:185`
- **Vorher (kompakt):** Scope-Regeln vorhanden, Tabellenfelder nicht vollständig explizit.
- **Nachher (kompakt):** Tabelle `user_settings_value` mit Feldern dokumentiert (`id`, `setting_key`, `scope_type`, `scope_id`, `value_json`, `updated_at`, `updated_by`) plus Unique-Constraint `(setting_key, scope_type, scope_id)`.

- **Datei/Anker:** `.ai/implementation.md:199`
- **Vorher (kompakt):** ROLE-Konvention erwähnt, aber nicht klar als bewusste Nicht-`role_id`-Entscheidung hervorgehoben.
- **Nachher (kompakt):** Klarstellung: `ROLE` nutzt bewusst Rollencode (`READER|DISPATCHER|ADMIN`), nicht numerische `role_id`; `GLOBAL` nutzt Konvention `scope_id = "global"`.

## 9) Settings-Rollenmapping und Scope-Resolution konsistent

- **Datei/Anker:** `.ai/architecture.md:663`, `.ai/architecture.md:712`
- **Vorher (kompakt):** Mapping und Metadatenherkunft konnten missverstanden werden.
- **Nachher (kompakt):** `READER->LESER`, `DISPATCHER->DISPONENT`, `ADMIN->ADMIN` als Darstellungs-/API-Normalisierung (nicht DB-Wahrheit); `defaultValue`/Definitionen aus Registry, persistierte Werte aus `user_settings_value`.

## 10) Registry-Key-Beispiel `attachmentPreviewSize` harmonisiert

- **Datei/Anker:** `.ai/architecture.md:632`, `.ai/implementation.md:209`, `.ai/implementation.md:211`
- **Vorher (kompakt):** Key teilweise geführt, Default-Herkunft nicht in beiden Dokumenten gleich klar.
- **Nachher (kompakt):** Einheitlich: `attachmentPreviewSize` mit `small|medium|large`, Default `medium`; Default kommt aus Registry (`DEFAULT`), wenn kein persistierter Scope-Wert existiert.

---

## Betroffene Dateien in diesem Sammelnachweis

- Geänderte Fachdokumente: `.ai/architecture.md`, `.ai/implementation.md`
- Neu erstellt für die Zusammenfassung: `docs/2026-02-07_aenderungsnachweise_gesamt.md`
