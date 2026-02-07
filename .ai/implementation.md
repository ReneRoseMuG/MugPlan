# MuGPlan – Engineering Handbook (Ist‑Stand)

## Zweck dieser Datei

Diese Datei ist das praktische Arbeits‑ und Betriebs‑Handbuch zur MuGPlan‑Codebasis. Sie ergänzt `architecture.md`, ohne Feature‑ und Use‑Case‑Texte zu duplizieren. Fachliche Abläufe und ausführliche Use‑Cases werden ausschließlich in der zentralen Feature‑/Use‑Case‑Sammlung beschrieben; hier stehen nur die technischen Konsequenzen, Konventionen und Handgriffe, die ein Entwickler beim Arbeiten am Code unmittelbar braucht.

## Was diese Datei bewusst nicht ist

Diese Datei ist keine zweite Architekturbeschreibung und keine Wiederholung der Feature‑Texte. Wenn etwas „warum fachlich“ ist, gehört es in die Feature‑/Use‑Case‑Dokumentation. Wenn etwas „wie im Code“ ist, gehört es hierher.

---

# 1. Projektbetrieb

## 1.1 Start‑ und Build‑Modell

MuGPlan wird als gemeinsamer Dev‑Prozess betrieben, in dem das Backend die REST‑API bereitstellt und im Development Vite so integriert wird, dass Frontend und Backend zusammen laufen. Im Production‑Modus liefert der Server die gebauten statischen Assets aus.

## 1.2 Konfiguration (Environment)

Das Backend benötigt Zugangsdaten zur Datenbank sowie ggf. Pfade für Upload‑Speicher. Diese Werte werden über Environment‑Variablen bereitgestellt. Wenn eine Variable fehlt oder falsch ist, ist die Regel, zuerst den Serverstart und die DB‑Verbindung zu verifizieren, bevor man „symptomatisch“ an einzelnen Endpunkten debuggt.

## 1.3 Datenbank‑Realität

Im Ist‑Stand ist die Persistenz MySQL‑basiert. Schema und referentielle Integrität sind im MySQL‑Dump vollständig sichtbar. Die Backend‑Implementierung nutzt Drizzle ORM und mysql2. Bei Schema‑Änderungen ist das Archivierungsmodell zu respektieren, und Cascades in Join‑Tabellen sind bewusst zu prüfen.

---

# 2. Code‑Konventionen, die man einhalten muss

## 2.1 Contracts sind der API‑Vertrag

Die API‑Oberfläche wird zentral über `shared/routes.ts` als Contract‑Index definiert. Route‑Module benutzen diese Contract‑Pfadstrings. Für JSON‑Requests validieren und parsen Controller über die Contract‑Schemas. Multipart‑Requests (insbesondere Uploads) sind ein definierter Sonderfall mit Multipart‑Parser und technischen Limits in der Controller‑Schicht. Neue Endpunkte werden nie „frei“ in Express definiert, sondern immer zuerst im Contract ergänzt.

## 2.2 Schichten im Backend

Backend‑Änderungen folgen der Kette Route → Controller → Service → Repository.

Der Controller ist für Parsing und Validierung zuständig und soll keine Fachlogik enthalten. Für JSON‑Requests erfolgt Parsing/Validierung über Contracts; für Multipart‑Requests über den vorgesehenen Multipart‑Parser mit Limits.

Der Service ist der Ort für Fachregeln, Aggregation und Querbezüge zwischen Entitäten.

Das Repository kapselt Datenbankzugriffe und verhindert, dass Query‑Details in den Service diffundieren.

## 2.3 UI‑Bausteine bleiben strukturell

Im Frontend bleiben wiederverwendbare UI‑Bausteine strukturell. Fachlogik gehört nicht in generische Layout‑ oder UI‑Komponenten, sondern in Page‑Ebene und fachnahe Hooks.

## 2.4 React Query ist die Server‑State‑Wahrheit

Server‑State wird über TanStack React Query verwaltet. Mutationen invalidieren die betroffenen Queries, statt lokale „Korrekturzustände“ zu erzeugen. Optimistic UI ist die Ausnahme und wird nur dort genutzt, wo fachliche Regeln sicher nicht betroffen sind oder ein Rollback sauber möglich ist.

---

# 3. Praktische Arbeitsmuster im Code

## 3.1 Einen neuen Endpunkt hinzufügen

Zuerst wird im Contract‑Index (`shared/routes.ts`) eine neue Definition ergänzt (Path und Zod‑Schemas).

Danach wird im passenden `server/routes/*Routes.ts` der Endpunkt registriert, indem exakt der Contract‑Path verwendet wird.

Im Controller wird JSON‑Input über das Contract‑Schema geparst; Multipart‑Input wird über den vorgesehenen Multipart‑Parser mit Limits verarbeitet. Die Ausführung wird anschließend an einen Service delegiert.

Im Service werden Fachregeln durchgesetzt und für Persistenz wird ein Repository genutzt.

## 3.2 Eine neue Liste/Verwaltungsseite hinzufügen

Neue Listen‑Screens sollen die vorhandene Kompositionsschicht nutzen, insbesondere `CardListLayout` oder `FilteredCardListLayout`, und die Entity‑Karten über `EntityCard`‑Pattern integrieren.

Formulare und Dialoge werden bevorzugt über die vorhandenen Edit‑Dialog‑Bausteine umgesetzt, statt neue Dialog‑Paradigmen einzuführen.

## 3.3 Ein neues Sidepanel im Detail‑Kontext hinzufügen

Panels werden als klar abgegrenzte Child‑Collections verstanden und folgen dem `SidebarChildPanel`‑Pattern. Neue Panels dürfen nicht implizit Seiteneffekte auf andere Panels auslösen, sondern müssen über klare Props und Query‑Hooks gekoppelt sein.

## 3.4 Kalenderfeatures erweitern

Kalenderfeatures sind systemkritisch. Neue kalenderrelevante Daten gehören in die serverseitige Aggregation, damit alle Views konsistent bleiben. Die Views sollen nicht durch zusätzliche parallele Requests auseinanderdriften.

---

# 4. Fehlerbehandlung und Debugging

## 4.1 Validierungsfehler vs. Fachfehler

Validierungsfehler entstehen, wenn Requests nicht dem Contract entsprechen. Diese werden als 400 beantwortet und sollen im Frontend als formale Eingabefehler behandelt werden.

Fachfehler entstehen, wenn Requests formal korrekt sind, aber gegen Regeln verstoßen. Diese werden als explizite Service‑Errors modelliert und mit passendem Statuscode und einer maschinenlesbaren Message beantwortet.

Für die Hard-Rule zur Mitarbeiter-Überschneidungsprüfung bei Terminzuweisungen konnte im Gegencheck der aktuelle Implementationsstand der serverseitigen Konfliktblockierung nicht eindeutig bestätigt werden. Diese Regel bleibt fachlich verbindlich als Zielzustand, ist im Ist‑Stand aber noch nicht zuverlässig verifiziert beziehungsweise noch nicht vollständig umgesetzt.

Zur belastbaren Absicherung der Hard-Rule ist daher eine separate Implementations-/Refactoring-Aufgabe notwendig, die die serverseitige Konfliktblockierung eindeutig herstellt und verifizierbar macht.

## 4.2 Lock‑ und Rollenprobleme

Wenn Interaktionen im Kalender „nicht gehen“, wird zuerst geprüft, ob der Termin gesperrt ist und welches technische Kontextsignal über den Request mitläuft. Im aktuellen Ist‑Stand wird dafür unter anderem `x-user-role` verwendet; dieses Signal ist nicht autoritativ und kein Rollen‑ oder Berechtigungsmodell. Die UI blockiert entsprechend, und der Server trifft derzeit dieselbe Lock‑Entscheidung auf Basis dieses Signals.

## 4.3 Typische Debug‑Reihenfolge

Wenn etwas nicht funktioniert, wird zuerst der Contract geprüft, dann der Controller‑Parse, dann der Service‑Pfad und erst danach das Repository. Diese Reihenfolge verhindert, dass man Datenbankqueries debuggt, obwohl der Request bereits an der Validierung scheitert.

---

# 5. Footguns und Hotspots

## 5.1 Kalender‑Repository Stabilität

Im Projektmaterial ist eine Auffälligkeit im Kalender‑Repository vermerkt, die auf inkonsistente Variablen im Scope hindeutet. Bei Änderungen rund um Kalenderdaten ist deshalb der erste Schritt immer, Build und Typecheck in diesem Pfad zu verifizieren, bevor neue Logik ergänzt wird.

## 5.2 Archivierung statt Löschen

Viele Entitäten sind fachlich als „archivierbar“ modelliert. Implementierungen dürfen nicht von physischem Löschen ausgehen, weil historische Zuordnungen erhalten bleiben müssen.

---

# 6. Verweise statt Duplikation

Für fachliche Details, Ablauftexte und vollständige Use‑Cases gilt: Diese Datei verweist nur.

Die maßgebliche Quelle für Feature‑ und Use‑Case‑Texte ist die zentrale Feature‑/Use‑Case‑Sammlung. In Architektur‑ und Implementierungsdokumenten wird maximal die technische Konsequenz (Invarianten, Validierung, Datenflüsse, Schnittstellen) beschrieben.

---

# 7. FT (18) User Settings - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die konkrete technische Umsetzung von FT (18) in der Codebasis. Ziel ist, dass ein Entwickler nicht nur versteht, was gebaut wurde, sondern auch reproduzierbar darauf aufbauen kann.

## 7.1 Zielbild von FT (18)

FT (18) liefert eine read-only Settings-Infrastruktur mit:

- zentraler Registry,
- Scope-Auflösung (`GLOBAL`, `ROLE`, `USER`),
- serverseitiger Auflösung (kein Frontend-Fallback auf Defaults),
- Contract-First Endpunkt für resolved Settings,
- zentralem Frontend-Provider und Landing-Page unter "Einstellungen".

Es gibt bewusst keinen Save-Flow in der UI.

## 7.2 Relevante Dateien (Backend)

### Shared Contract und Schema

- `shared/routes.ts`
  Enthält den neuen Contract `api.userSettings.getResolved`.
- `shared/schema.ts`
  Enthält:
  - `roles`
  - `users`
  - `user_settings_value`

### Route/Controller/Service/Repository

- `server/routes/userSettingsRoutes.ts`
- `server/controllers/userSettingsController.ts`
- `server/services/userSettingsService.ts`
- `server/repositories/userSettingsRepository.ts`
- `server/repositories/usersRepository.ts`
- `server/settings/registry.ts`
- `server/middleware/requestUserContext.ts`
- `server/routes.ts` (Route-Registrierung)

## 7.3 Relevante Dateien (Frontend)

- `client/src/providers/SettingsProvider.tsx`
- `client/src/hooks/useSettings.ts`
- `client/src/components/SettingsPage.tsx`
- `client/src/App.tsx` (Provider-Einbindung)
- `client/src/pages/Home.tsx` (View-Erweiterung)
- `client/src/components/Sidebar.tsx` (bestehender Menüpunkt aktiv)

## 7.4 Scope-Modell und Persistenzkonventionen

### 7.4.1 Erlaubte Scopes

Es gelten genau drei Scopes:

- `GLOBAL`
- `ROLE`
- `USER`

### 7.4.2 Persistenzregeln in `user_settings_value`

Die Persistenz erfolgt in der Tabelle `user_settings_value` mit den folgenden relevanten Feldern:

- `id`
- `setting_key`
- `scope_type` (`GLOBAL|ROLE|USER`)
- `scope_id`
- `value_json`
- `updated_at`
- `updated_by` (optional)

Unique-Constraint:

- `(setting_key, scope_type, scope_id)`

Scope-Konventionen:

- `GLOBAL`: `scope_id = "global"`
- `ROLE`: `scope_id = DB-Rollencode` (`READER|DISPATCHER|ADMIN`), bewusst nicht numerische `role_id`
- `USER`: `scope_id = userId` als String

Diese Konventionen sind nicht optional, sondern stabiler Teil des Datenmodells.

### 7.4.3 Registry-Beispiel und Default-Herkunft

Der aktuell geführte Registry-Key ist `attachmentPreviewSize` mit Wertebereich `small|medium|large` und Default `medium`.

Wenn für einen Scope kein persistierter Wert in `user_settings_value` vorliegt (oder kein gültiger Kandidat aufgelöst werden kann), stammt der wirksame Default aus der Settings-Registry (`DEFAULT` in der Resolver-Reihenfolge), nicht aus einer impliziten DB-Vorgabe.

## 7.5 Rollenmodell und Mapping

### 7.5.1 DB-Rollen (persistiert)

- `READER`
- `DISPATCHER`
- `ADMIN`

### 7.5.2 Kanonische Rollen (Resolver/API/UI)

- `LESER`
- `DISPONENT`
- `ADMIN`

Mapping erfolgt serverseitig im Settings-Kontext:

- `READER -> LESER`
- `DISPATCHER -> DISPONENT`
- `ADMIN -> ADMIN`

Wichtig: Storage bleibt bei DB-Codes, API liefert kanonische Semantik.

## 7.6 Resolver-Ablauf im Service

`userSettingsService` arbeitet in dieser Reihenfolge:

1. User-Kontext prüfen (`userId` vorhanden)
2. `usersRepository` liest User + Rollen-Code aus DB
3. Rollen-Code validieren und kanonisieren
4. Repository lädt Kandidatenwerte für den User:
   - USER-Kandidat
   - ROLE-Kandidat
   - GLOBAL-Kandidat
5. Pro Setting-Key Auflösung strikt:
   - USER > ROLE > GLOBAL > DEFAULT
6. Invalid persistierte Werte (Validator fail) werden ignoriert und zur nächsten Stufe gefällt
7. Response-Objekt inkl. `resolvedScope`, `roleCode`, `roleKey` wird gebaut

## 7.7 Contract-First Response-Semantik

Der Endpunkt `GET /api/user-settings/resolved` liefert pro Key mindestens:

- `defaultValue`
- `globalValue?`
- `roleValue?`
- `userValue?`
- `resolvedValue`
- `resolvedScope`
- `roleCode`
- `roleKey`

Damit kann die Landing-Page die Herkunft eines Werts anzeigen, ohne Resolverlogik im Client.

## 7.8 Frontend-Verwendung

### 7.8.1 Provider und Hooks

`SettingsProvider` kapselt Laden, Fehlerzustand und Retry.

`useSettings()` liefert den Gesamtzustand.

`useSetting(key)` liefert den wirksamen Wert key-basiert, ohne Prop-Drilling.

### 7.8.2 Landing-Page

`SettingsPage` ist bewusst read-only und zeigt:

- Label
- wirksamen Wert (`resolvedValue`)
- Herkunft (`resolvedScope`)

Keine Edit-Felder, keine Save-Aktionen.

## 7.9 Seed und Migration

### 7.9.1 Rollen-Seed

- Script: `script/seed-roles.ts`
- NPM Script: `db:seed:roles`

Seed ist idempotent und arbeitet mit DB-Codes (`READER`, `DISPATCHER`, `ADMIN`).

### 7.9.2 SQL-Datei

- `migrations/2026-02-07_ft18_settings_scopes.sql`

Enthält Tabellen/Constraints für:

- `roles`
- `users`
- `user_settings_value`

inkl. Rollen-Insert via `ON DUPLICATE KEY UPDATE`.

## 7.10 Betriebshinweise und aktuelle Übergangslösung

Der langfristige Zielzustand ist echter Auth-Kontext mit serverseitig ermittelter `userId`.

Aktuell wird für FT (18) `req.userId` übergangsweise über `SETTINGS_USER_ID` gesetzt (`requestUserContext`). Das ist eine bewusst begrenzte Lösung, um FT (18) ohne parallele Auth-Replattforming-Arbeit auslieferbar und testbar zu machen. Dieser Mechanismus liefert im aktuellen Entwicklungsstand ausschließlich den Identitätsinput und ersetzt keine Authentifizierung und keine Session.

Die Rollenauflösung selbst bleibt trotzdem DB-basiert (`users -> roles`) und wird nicht aus Frontenddaten abgeleitet. "Serverseitig" bedeutet hier die autoritative Rollenquelle aus der DB, nicht bereits einen vollständig authentifizierten Session-Kontext.

Diese DB-basierte Rollenauflösung ist das autoritative Modell. Eine eventuelle Header-Nutzung in anderen Bereichen ist nicht als Rollen- oder Berechtigungsmodell zu interpretieren, sondern nur als technischer Kontext für Entwicklung und UI-Simulation. Für den aktuellen Kalender-/Terminbereich bedeutet das: Es gibt dort derzeit keine belastbare serverseitige Rollenbegrenzung, solange Rollenentscheidungen auf dem nicht-autoritativen Signal `x-user-role` beruhen.

## 7.11 Verifikation von FT (18)

Durchgeführt und erfolgreich:

- `npm run check`
- `npm run build`

Empfohlene manuelle Prüfpunkte:

1. Menüpunkt "Einstellungen" öffnet Landing-Page.
2. Endpunkt `GET /api/user-settings/resolved` liefert Payload mit `resolvedScope`.
3. Bei Fehler zeigt Landing-Page sinnvollen Fehlerzustand mit Retry.
4. ROLE-Werte greifen nur für die zum User gehörige DB-Rolle.

## 7.12 Follow-up nach FT (18)

Wenn Auth-System erweitert wird, sollte zuerst `requestUserContext` durch echte Auth-Middleware ersetzt werden. Der Resolver- und Persistenzkern von FT (18) kann dabei unverändert bleiben, solange `userId` verlässlich aus dem Request-Kontext kommt.

Write-Endpunkte für Settings sollten dieselben Regeln wiederverwenden:

- Scope-Gültigkeit über `allowedScopes`
- Rollenmapping zentral im Backend
- keine clientseitige Scope- oder Defaultlogik

---

# 8. FT (19) Attachments für Customer/Employee - Implementierungsleitfaden (Ist-Stand)

Dieser Abschnitt dokumentiert die technische Umsetzung von FT (19) vollständig und operativ. Fokus ist die reproduzierbare Umsetzung über alle Schichten hinweg mit klarer Semantik für Download und Delete.

## 8.1 Zielbild von FT (19)

FT (19) erweitert die bestehende Projekt-Attachment-Funktion auf:

- Customer-Attachments
- Employee-Attachments

Dabei wurden drei technische und fachliche Leitentscheidungen umgesetzt:

1. Attachments bleiben domaingebundene Datensätze (kein polymorphes Modell).
2. Download-Logik ist zentralisiert und domänenübergreifend konsistent.
3. Delete ist systemweit deaktiviert (UI und API).

## 8.2 Relevante Dateien (Backend)

### 8.2.1 Shared Schema und Contract

- `shared/schema.ts`
  - neue Tabellen `customer_attachment`, `employee_attachment`
  - neue Typen/Insert-Schemas für Customer/Employee Attachments
- `shared/routes.ts`
  - neuer Contract-Bereich `customerAttachments`
  - neuer Contract-Bereich `employeeAttachments`
  - Anpassung `projectAttachments.delete` auf Blockierungssemantik

### 8.2.2 Route/Controller/Service/Repository

- `server/routes/customerAttachmentsRoutes.ts`
- `server/controllers/customerAttachmentsController.ts`
- `server/services/customerAttachmentsService.ts`
- `server/repositories/customersRepository.ts`

- `server/routes/employeeAttachmentsRoutes.ts`
- `server/controllers/employeeAttachmentsController.ts`
- `server/services/employeeAttachmentsService.ts`
- `server/repositories/employeesRepository.ts`

- bestehend, angepasst:
  - `server/routes/projectAttachmentsRoutes.ts`
  - `server/controllers/projectAttachmentsController.ts`
  - `server/services/projectAttachmentsService.ts`
  - `server/repositories/projectsRepository.ts`

- zentrale Registrierung:
  - `server/routes.ts`

### 8.2.3 Gemeinsame Libs

- `server/lib/attachmentFiles.ts`
  - Upload-Limits und Dateiverarbeitung
  - Sanitization, MIME-Ableitung, persistenter Dateiname
- `server/lib/attachmentDownload.ts`
  - zentrale Header-/Disposition-/Streaming-Logik

## 8.3 Relevante Dateien (Frontend)

- `client/src/components/AttachmentsPanel.tsx` (generisches Panel)
- `client/src/components/ProjectAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/CustomerAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/EmployeeAttachmentsPanel.tsx` (Wrapper)
- `client/src/components/ui/attachment-info-badge.tsx` (no-remove bei fehlendem Handler)
- `client/src/components/CustomerData.tsx` (Integration)
- `client/src/components/EmployeePage.tsx` (Integration)

## 8.4 Persistenzmodell im Detail

### 8.4.1 Tabellenstruktur

Neue Tabellen sind strukturgleich zu `project_attachment`:

- `id`
- Parent-FK (`customer_id` / `employee_id`)
- `filename`
- `original_name`
- `mime_type`
- `file_size`
- `storage_path`
- `created_at`

### 8.4.2 Constraints und Indizes

Pro Tabelle:

- PK auf `id`
- FK-Index auf Parent-ID
- FK mit `ON DELETE CASCADE`

Damit sind Parent-bezogene Listenabfragen effizient und Parent-Löschung konsistent.

### 8.4.3 Migration

- SQL-Datei: `migrations/2026-02-07_ft19_customer_employee_attachments.sql`

Enthält:

- `CREATE TABLE customer_attachment`
- `CREATE TABLE employee_attachment`
- jeweils FK-Constraint + Key auf Parent-ID

## 8.5 API-Semantik und Endpunkte

### 8.5.1 Customer

- `GET /api/customers/:customerId/attachments`
- `POST /api/customers/:customerId/attachments`
- `GET /api/customer-attachments/:id/download`

Kein Delete-Endpunkt.

### 8.5.2 Employee

- `GET /api/employees/:employeeId/attachments`
- `POST /api/employees/:employeeId/attachments`
- `GET /api/employee-attachments/:id/download`

Kein Delete-Endpunkt.

### 8.5.3 Project

- `GET /api/projects/:projectId/attachments`
- `POST /api/projects/:projectId/attachments`
- `GET /api/project-attachments/:id/download`
- `DELETE /api/project-attachments/:id` ist absichtlich blockiert (`405`)

Blockierungsantwort:

- Status: `405`
- Body: `{ "message": "Attachment deletion is disabled" }`

## 8.6 Upload-Implementierungsdetails

Uploads laufen in allen drei Domänen identisch:

- Multipart Parser: `parseMultipartFile`
- Feldname: `file`
- Größenlimit: `10 MB`
- Originalname wird sanitiziert
- persistenter Dateiname wird zufallsbasiert generiert
- Datei wird in `server/uploads` geschrieben
- Metadaten werden in der jeweiligen Domain-Tabelle persistiert

Fehlerfall bei zu großer Datei:

- Status `413`
- klare Fehlermeldung im Controller

## 8.7 Download-Implementierungsdetails

Die Controller selbst enthalten keine individuelle Headerlogik mehr. Sie:

1. parsen die Attachment-ID,
2. laden den Datensatz aus passendem Service/Repository,
3. delegieren an `sendAttachmentDownload(...)`.

Die zentrale Funktion setzt:

- `Content-Type` auf ermittelten MIME-Typ (Fallback: octet-stream),
- `Content-Disposition` anhand der Disposition-Regel,
- Dateiauslieferung per `res.sendFile(...)`.

Disposition-Regel:

- `inline` für PDF und Images,
- sonst `attachment`,
- `?download=1` erzwingt `attachment`.

## 8.8 Delete-Deaktivierung: technische Umsetzung

Delete wird nicht nur in der UI entfernt, sondern serverseitig verhindert:

- Customer/Employee: kein Delete-Contract, keine Delete-Route, keine Delete-Controllerfunktion.
- Project: Delete-Route bleibt erreichbar, antwortet aber deterministisch mit Blockierung (`405`, feste Message).

Damit ist der Schutz robust gegen direkte API-Aufrufe.

## 8.9 Frontend-Pattern und Wrapper-Struktur

### 8.9.1 Generisches Panel

`AttachmentsPanel` ist rein strukturell und kennt keine Domain-API. Es rendert:

- Header + Add-Action
- Loading-/Empty-/List-State
- Item-Liste über `AttachmentInfoBadge`

Props enthalten ausschließlich Daten und Callback-Schnittstellen, u. a.:

- `items`
- `isLoading`
- `canUpload`
- `isUploading`
- `onUpload(file)`
- `buildOpenUrl(id)`
- `buildDownloadUrl(id)`

### 8.9.2 Domain-Wrapper

Jeder Wrapper kapselt:

- Domain-spezifischen Query-Key
- Domain-spezifischen Upload-Endpunkt
- Invalidation nach Upload
- URL-Building für Open/Download

Keine Wrapper-Variante rendert eine Delete-Aktion.

## 8.10 React Query und Invalidation

Verwendete Keys:

- Projekt: `["/api/projects", projectId, "attachments"]`
- Customer: `["/api/customers", customerId, "attachments"]`
- Employee: `["/api/employees", employeeId, "attachments"]`

Nach erfolgreichem Upload invalidiert jeder Wrapper exakt den eigenen Key.

Es gibt keine lokalen Schattenzustände für Attachment-Listen.

## 8.11 UI-Verhalten und Zustände

Alle drei Domains zeigen dieselben Zustände:

- Laden
- leer
- Liste mit Badges

Pro Badge sind zwei Aktionen über Preview verfügbar:

- Öffnen (normale Download-Route)
- Download (Route mit `download=1`)

Eine Remove-/Delete-Schaltfläche wird nicht angezeigt.

## 8.12 Betriebs- und Debug-Hinweise

### 8.12.1 Wenn Upload fehlschlägt

Prüfreihenfolge:

1. Multipart Header/Boundary vorhanden
2. Feldname wirklich `file`
3. Dateigröße <= 10 MB
4. Schreibrechte auf `server/uploads`
5. DB-Insert in Domain-Tabelle erfolgreich

### 8.12.2 Wenn Download fehlschlägt

Prüfreihenfolge:

1. Attachment-ID valide geparsed
2. Datensatz in passender Tabelle vorhanden
3. `storage_path` zeigt auf existente Datei
4. zentraler Download-Pfad setzt Header korrekt

### 8.12.3 Wenn „Delete“ dennoch versucht wird

Erwartetes Verhalten:

- Projekt-Delete liefert `405` + `"Attachment deletion is disabled"`
- Customer/Employee haben keinen Delete-Endpunkt

Abweichungen davon gelten als Regression.

## 8.13 Verifikation von FT (19)

Technisch geprüft:

- `npm run check`
- `npm run build`

Empfohlene manuelle Prüfpunkte:

1. Upload in Projekt, Customer und Employee jeweils erfolgreich.
2. Open/Inline-Verhalten für PDF/Bild in allen drei Domains gleich.
3. Download mit `?download=1` liefert Attachment-Disposition.
4. Delete-UI ist nirgends sichtbar.
5. Direktaufruf `DELETE /api/project-attachments/:id` liefert Blockierungsantwort.

## 8.14 Follow-up nach FT (19)

Mögliche Folgearbeiten außerhalb des aktuellen Scopes:

- optionales Audit-Logging für Downloads,
- Retention-/Cleanup-Strategie für physische Dateien,
- ggf. künftiges Re-Enable von Delete mit expliziter Fachentscheidung und Datenhygienekonzept,
- feinere Rechteprüfung pro Attachment-Domäne.


