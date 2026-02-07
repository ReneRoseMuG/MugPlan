# Gegencheck-Bericht

Quelle: Soll-/Ist-Aussagen aus `.ai/architecture.md` und `.ai/implementation.md`, verifiziert gegen Codebase.

Statuswerte: `Bestätigt` | `Widerlegt` | `Nicht eindeutig verifizierbar`

## 1. Identitäts- und Kontextauflösung

1. Status: `Bestätigt`  
Soll-Aussage: Header-basierte Rolleninfo in Workflows (`.ai/architecture.md:441`)  
Ist-Aussage: Rollen-/Lock-Kontext im Request (`.ai/implementation.md:98-100`)  
Verifiziertes Verhalten: `server/controllers/appointmentsController.ts:8-11`, `client/src/lib/calendar-appointments.ts:57-60`, `client/src/components/AppointmentForm.tsx:112-115`, `client/src/components/AppointmentForm.tsx:335`  
Begründung: Kalender-/Terminflows senden und lesen `x-user-role`; Admin-Check erfolgt serverseitig.  
Konsequenz fürs Verständnis: Dokumentaussage für Termin/Calendar-Kontext ist korrekt.  
Einordnung: `Präzisierung`

2. Status: `Bestätigt`  
Soll-Aussage: FT(18) nutzt `req.userId` via Übergangslösung `SETTINGS_USER_ID`, Rolle DB-basiert (`.ai/architecture.md:731-733`)  
Ist-Aussage: identisch beschrieben (`.ai/implementation.md:289-291`)  
Verifiziertes Verhalten: `server/middleware/requestUserContext.ts:12-20`, `server/routes/userSettingsRoutes.ts:8`, `server/controllers/userSettingsController.ts:6-12`, `server/repositories/usersRepository.ts:6-14`  
Begründung: Middleware setzt `req.userId`; Rolle wird per `users`↔`roles` aus DB aufgelöst.  
Konsequenz fürs Verständnis: Settings-Kontext ist servergeführt, nicht headergeführt.  
Einordnung: `Redaktionelle Korrektur`

3. Status: `Widerlegt`  
Soll-Aussage: Server blockiert Mitarbeiter-Zeitüberschneidungen (`.ai/architecture.md:75`, `.ai/architecture.md:269`)  
Ist-Aussage: als Fachfehlerklasse allgemein beschrieben (`.ai/implementation.md:96-99`)  
Verifiziertes Verhalten: `server/services/appointmentsService.ts:89-162`, `server/repositories/appointmentsRepository.ts:62-111`  
Begründung: Keine Überschneidungsprüfung für Mitarbeiter bei Create/Update implementiert (nur Normalisierung und Persistenz).  
Konsequenz fürs Verständnis: Zentrale Architekturbehauptung ist im aktuellen Code nicht erfüllt.  
Einordnung: `Offene Entscheidung`

## 2. Settings-Konzept

4. Status: `Bestätigt`  
Soll-Aussage: Auflösung `USER > ROLE > GLOBAL > DEFAULT` (`.ai/architecture.md:642-647`)  
Ist-Aussage: identisch (`.ai/implementation.md:224-226`)  
Verifiziertes Verhalten: `server/services/userSettingsService.ts:105-117`  
Begründung: Resolver priorisiert exakt in dieser Reihenfolge.  
Konsequenz fürs Verständnis: Deterministische Scope-Auflösung ist technisch umgesetzt.  
Einordnung: `Redaktionelle Korrektur`

5. Status: `Bestätigt`  
Soll-Aussage: Scope-ID-Konventionen inkl. `global` Marker (`.ai/architecture.md:691-693`)  
Ist-Aussage: identisch (`.ai/implementation.md:181-183`)  
Verifiziertes Verhalten: `server/settings/registry.ts:43`, `server/repositories/userSettingsRepository.ts:38-40`, `shared/schema.ts:421-433`  
Begründung: Repository filtert exakt auf `GLOBAL/global`, `ROLE/<DB-Code>`, `USER/<userId>`.  
Konsequenz fürs Verständnis: Persistenzkonventionen sind konsistent über Schichten.  
Einordnung: `Redaktionelle Korrektur`

6. Status: `Bestätigt`  
Soll-Aussage: Response enthält Metadaten + Werte + `resolvedScope` + `roleCode`/`roleKey` (`.ai/architecture.md:705-710`)  
Ist-Aussage: Kernfelder genannt (`.ai/implementation.md:231-240`)  
Verifiziertes Verhalten: `shared/routes.ts:817-837`, `server/services/userSettingsService.ts:119-138`, `client/src/components/SettingsPage.tsx:58-68`  
Begründung: Contract und Service liefern die genannten Felder; UI nutzt sie.  
Konsequenz fürs Verständnis: Dokumentierte Response-Semantik ist vorhanden.  
Einordnung: `Präzisierung`

## 3. Attachments

7. Status: `Bestätigt`  
Soll-Aussage: Customer/Employee-Attachments als eigene Tabellen mit FK-Cascade (`.ai/architecture.md:779-782`, `.ai/architecture.md:795-796`)  
Ist-Aussage: identisch (`.ai/implementation.md:391-420`)  
Verifiziertes Verhalten: `shared/schema.ts:240-249`, `shared/schema.ts:357-366`, `migrations/2026-02-07_ft19_customer_employee_attachments.sql:1-14`, `migrations/2026-02-07_ft19_customer_employee_attachments.sql:16-29`  
Begründung: Tabellen/Constraints sind wie dokumentiert vorhanden.  
Konsequenz fürs Verständnis: Persistenzmodell ist dokumentkonform.  
Einordnung: `Redaktionelle Korrektur`

8. Status: `Bestätigt`  
Soll-Aussage: zentrale Download-Logik mit `download=1`, inline für PDF/Bilder (`.ai/architecture.md:819-832`)  
Ist-Aussage: identisch (`.ai/implementation.md:469-487`)  
Verifiziertes Verhalten: `server/lib/attachmentDownload.ts:11-17`, `server/lib/attachmentDownload.ts:24-27`, `server/controllers/projectAttachmentsController.ts:73-82`, `server/controllers/customerAttachmentsController.ts:79-88`, `server/controllers/employeeAttachmentsController.ts:79-88`  
Begründung: Controller delegieren an zentrale Download-Funktion; Disposition-Regel ist einheitlich.  
Konsequenz fürs Verständnis: Domänenübergreifend konsistentes Download-Verhalten.  
Einordnung: `Redaktionelle Korrektur`

9. Status: `Bestätigt`  
Soll-Aussage: Delete technisch deaktiviert (`405`) für Projekt, kein Delete für Customer/Employee (`.ai/architecture.md:813`)  
Ist-Aussage: identisch (`.ai/implementation.md:493-495`)  
Verifiziertes Verhalten: `shared/routes.ts:717-723`, `server/controllers/projectAttachmentsController.ts:88-92`, `server/routes/customerAttachmentsRoutes.ts:7-10`, `server/routes/employeeAttachmentsRoutes.ts:7-10`  
Begründung: Projekt-Delete liefert deterministisch `405`; andere Domänen haben keine Delete-Route.  
Konsequenz fürs Verständnis: Delete-Policy ist serverseitig durchgesetzt.  
Einordnung: `Redaktionelle Korrektur`

10. Status: `Bestätigt`  
Soll-Aussage: Upload-Konventionen: Multipart `file`, 10MB, gemeinsamer Pfad (`.ai/architecture.md:838-840`)  
Ist-Aussage: identisch (`.ai/implementation.md:456-462`)  
Verifiziertes Verhalten: `server/lib/attachmentFiles.ts:6`, `server/controllers/projectAttachmentsController.ts:32-35`, `server/controllers/customerAttachmentsController.ts:36-39`, `server/controllers/employeeAttachmentsController.ts:36-39`  
Begründung: Alle drei Controller nutzen denselben Parser/Limits/Feldnamen.  
Konsequenz fürs Verständnis: Einheitliches Upload-Verhalten bestätigt.  
Einordnung: `Redaktionelle Korrektur`

## 4. UI-Komposition und Datenverträge

11. Status: `Bestätigt`  
Soll-Aussage: Generisches `AttachmentsPanel` + Domain-Wrapper (`.ai/architecture.md:889-893`)  
Ist-Aussage: identisch (`.ai/implementation.md:379-382`, `.ai/implementation.md:500-527`)  
Verifiziertes Verhalten: `client/src/components/AttachmentsPanel.tsx:9-18`, `client/src/components/ProjectAttachmentsPanel.tsx:50-59`, `client/src/components/CustomerAttachmentsPanel.tsx:48-57`, `client/src/components/EmployeeAttachmentsPanel.tsx:48-57`  
Begründung: Struktur/Wrapper-Aufteilung entspricht Dokumenten.  
Konsequenz fürs Verständnis: UI-Kompositionsmuster konsistent implementiert.  
Einordnung: `Redaktionelle Korrektur`

12. Status: `Bestätigt`  
Soll-Aussage: Attachments-Query-Keys je Domäne (`.ai/architecture.md:908-910`)  
Ist-Aussage: identisch (`.ai/implementation.md:533-535`)  
Verifiziertes Verhalten: `client/src/components/ProjectAttachmentsPanel.tsx:17`, `client/src/components/CustomerAttachmentsPanel.tsx:15`, `client/src/components/EmployeeAttachmentsPanel.tsx:15`  
Begründung: Query-Keys entsprechen den dokumentierten Arrays.  
Konsequenz fürs Verständnis: Cache-/Invalidierungsvertrag ist stabil.  
Einordnung: `Redaktionelle Korrektur`

13. Status: `Bestätigt`  
Soll-Aussage: Kalenderaggregat enthält Projekt/Kunde/Tour/Mitarbeiter/Status/Lock (`.ai/architecture.md:119-123`)  
Ist-Aussage: als Kernfluss beschrieben (`.ai/implementation.md:127-133`)  
Verifiziertes Verhalten: `server/services/appointmentsService.ts:269-290`, `shared/routes.ts:149-182`, `client/src/lib/calendar-appointments.ts:3-23`  
Begründung: Service erzeugt diese Struktur; Contract und Frontend-Typ passen.  
Konsequenz fürs Verständnis: Datenvertrag Backend↔Frontend ist konsistent.  
Einordnung: `Redaktionelle Korrektur`

14. Status: `Bestätigt`  
Soll-Aussage: Settings im bestehenden Menüfluss (`.ai/architecture.md:739-744`)  
Ist-Aussage: Sidebar/Home-Integration dokumentiert (`.ai/implementation.md:165-167`)  
Verifiziertes Verhalten: `client/src/components/Sidebar.tsx:133`, `client/src/pages/Home.tsx:263-264`, `client/src/App.tsx:44-52`  
Begründung: Menüpunkt vorhanden, View rendert `SettingsPage`, Provider global eingebunden.  
Konsequenz fürs Verständnis: UI-Integration bestätigt.  
Einordnung: `Redaktionelle Korrektur`

## 5. Schichtentrennung und Verantwortlichkeiten

15. Status: `Bestätigt`  
Soll-Aussage: Route → Controller → Service → Repository (`.ai/architecture.md:91-99`)  
Ist-Aussage: gleiches Muster (`.ai/implementation.md:46-54`)  
Verifiziertes Verhalten: `server/routes/userSettingsRoutes.ts:8`, `server/controllers/userSettingsController.ts:11`, `server/services/userSettingsService.ts:65`, `server/repositories/userSettingsRepository.ts:24-45`  
Begründung: Schichtkette ist in mehreren Modulen klar erkennbar.  
Konsequenz fürs Verständnis: Architekturprinzip umgesetzt.  
Einordnung: `Redaktionelle Korrektur`

16. Status: `Bestätigt`  
Soll-Aussage: Contract-First mit zentralem `shared/routes.ts` (`.ai/architecture.md:154-161`, `.ai/architecture.md:697-702`)  
Ist-Aussage: identisch (`.ai/implementation.md:41-43`)  
Verifiziertes Verhalten: `shared/routes.ts:31-32`, `server/routes/projectAttachmentsRoutes.ts:7-10`, `server/controllers/appointmentsController.ts:29`, `server/controllers/appointmentsController.ts:49`  
Begründung: Routen nutzen `api.*.path`, Controller parsen über `api.*.input.parse` bei JSON-Input.  
Konsequenz fürs Verständnis: API-Vertrag zentralisiert.  
Einordnung: `Redaktionelle Korrektur`

17. Status: `Nicht eindeutig verifizierbar`  
Soll-Aussage: "Controller übernehmen Validierung und Request-Parsing" als strikte Leitlinie (`.ai/architecture.md:95-97`)  
Ist-Aussage: gleichlautend als Konvention (`.ai/implementation.md:48-54`)  
Verifiziertes Verhalten: `server/controllers/appointmentsController.ts:29`, `server/controllers/appointmentsController.ts:49`, `server/controllers/projectAttachmentsController.ts:32-35`  
Begründung: JSON-Endpoints parsebasiert via Contract; Multipart-Endpoints validieren manuell. Ob das dokumentarisch als Ausnahme oder Abweichung gilt, ist nicht scharf spezifiziert.  
Konsequenz fürs Verständnis: Leitlinieninterpretation bleibt teilweise offen.  
Einordnung: `Präzisierung`

---

## Separater Zusatzblock: strukturell problematische Architekturstellen (nur `architecture.md`)

1. Passage: `.ai/architecture.md:356` vs `.ai/architecture.md:813`  
Konfliktbeschreibung: Gleicher Endpunkt `DELETE /api/project-attachments/:id` wird einmal als normaler API-Pfad im Katalog, später als fachlich deaktiviert mit fixer `405`-Blockierung beschrieben.  
Warum strukturell problematisch: Die API-Landkarte enthält zwei gegensätzliche Semantiken für denselben Pfad; daraus folgt widersprüchliche Implementierungs-/Testableitung.  
Kennzeichnung: `Entscheidungsbedarf`

2. Passage: `.ai/architecture.md:441` vs `.ai/architecture.md:731-733`  
Konfliktbeschreibung: Einerseits wird Header-basierte Rollenübermittlung als Workflow-Pattern beschrieben, andererseits für FT(18) explizit ausgeschlossen (DB-basierte Rollenauflösung, nicht aus Client-Headern).  
Warum strukturell problematisch: Ohne klare Geltungsgrenzen pro Domäne kann dieselbe Querschnittsfrage (Rollenquelle) unterschiedlich interpretiert und inkonsistent fortgeführt werden.  
Kennzeichnung: `Entscheidungsbedarf`
