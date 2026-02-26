# Vollständiger Audit- und Test-Fehlerreport

Datum: 2026-02-26
Projektpfad: `C:\Users\r.rose\repos\Plan\releases\work`

## Ausgeführte Kommandos

1. `npm run check` -> Exit Code `1`
2. `npm run review` -> Exit Code `1` (stoppt bei `typecheck`)
3. `npm run lint` -> Exit Code `1`
4. `npm run audit` -> Exit Code `1`
5. `npm run secrets` -> Exit Code `0`
6. `npm run test:run` -> Exit Code `1`
7. `npm run test:run -- --reporter=junit --outputFile=logs/vitest-junit.xml` -> Exit Code `1` (Report erfolgreich geschrieben)

## Executive Summary

- Typ-/Compile-Fehler: 3
- Lint-Fehler: 8
- Security-Dependency-Fehler (`npm audit`): 3
- Secret-Scan-Fehler: 0
- Testfehler: 33 (von 637 Tests)
- Gesamtanzahl Fehlerbefunde: 47

## Gruppierung nach Schwere

### Critical

- SEC-002 `minimatch` ReDoS (high)
- SEC-003 `rollup` Arbitrary File Write / Path Traversal (high)
- T-009 READER darf Mitarbeiter anlegen (201 statt 403)
- T-021 Deaktivierter Mitarbeiter kann Terminzuweisung erhalten (201 statt Block)
- T-025 READER darf Mitarbeiter-Anhang hochladen (201 statt 403)
- T-029 READER darf Projekt-Anhang hochladen (201 statt 403)

### High

- TS-001 Unbenutzte Variable `toast` blockiert Typecheck
- TS-002 RegExp-Flag nicht kompatibel mit aktuellem TS-Target
- TS-003 RegExp-Flag nicht kompatibel mit aktuellem TS-Target
- L-001 Floating Promise in `App.tsx`
- L-002 Async-Handler falsch in `AppointmentForm.tsx`
- L-003 Async-Handler falsch in `CustomerData.tsx`
- L-004 Async-Handler falsch in `ProjectForm.tsx`
- L-005 Unused var `toast` in `CalendarYearView.tsx`
- L-006 Unused var `toastDesktopPositionValues` in `useSettings.ts`
- L-007 Async-Handler falsch in `AdminSetup.tsx`
- L-008 Async-Handler falsch in `Login.tsx`
- T-004 Upload Oversize endet mit `socket hang up` statt sauberem 413-Handling
- T-005 Unknown-Employee-Upload liefert 500 statt 404
- T-024 Unknown-Project-Upload liefert 500 statt 404
- T-027 Projekt-Detail-Aggregat verletzt Contract (`projectStatuses` fehlt)

### Medium

- SEC-001 `ajv` ReDoS (moderate)
- T-001, T-002, T-003, T-015, T-016, T-017, T-018, T-019, T-020, T-022, T-023, T-033: `NOT_IMPLEMENTED_BY_SCOPE` / fehlende API-Contracts
- T-006 Delete-Blocking für Employee-Attachments nicht verifizierbar
- T-007, T-008, T-010, T-011, T-026, T-030, T-031, T-032: Testisolations-/Testdatenkonflikte (`Username already exists`, `CUSTOMER_NUMBER_CONFLICT`)
- T-012, T-013, T-014: Cross-View-Contracts als nicht direkt backend-seitig verifizierbar markiert
- T-028 Datumslogik-Fehler im Testaufbau (`Datum in der Vergangenheit`)

## Gruppierung nach vermuteter Lösungskategorie

### Type-System / Toolchain

- TS-001, TS-002, TS-003

### Lint / Async-Handling / Code-Qualität

- L-001 bis L-008

### Security / Dependencies

- SEC-001, SEC-002, SEC-003

### API Authorization / Access Control

- T-009, T-025, T-029

### Domain-Regeln / Business-Validierung

- T-021, T-028

### Error-Mapping / HTTP-Status-Codes

- T-004, T-005, T-024

### API-Contract / Fehlende Endpunkte / Scope-Lücken

- T-001, T-002, T-003, T-012, T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020, T-022, T-023, T-033

### Testdaten-Isolation / Determinismus

- T-007, T-008, T-010, T-011, T-026, T-030, T-031, T-032

### UI-Wiring / Snapshot-Contract Drift

- T-027

## Einzelanalyse je Fehler (ohne Codefix)

### Audit: TypeScript

1. **TS-001**
- Befund: `client/src/components/calendar/CalendarYearView.tsx:41` -> `TS6133: 'toast' is declared but its value is never read`.
- Vermutete Ursache: Altvariable nach Refactor stehengeblieben.
- Lösungskategorie: Type-System / Cleanup.
- Lösungsansatz: Unbenutzten Import/Variable entfernen oder Verwendung wiederherstellen.

2. **TS-002**
- Befund: `server/services/documentHeaderDeterministicParser.ts:255` -> `TS1501` RegExp-Flag nur mit ES6+.
- Vermutete Ursache: Verwendetes RegExp-Feature passt nicht zum effektiven TS-`target`.
- Lösungskategorie: Toolchain/TS-Config oder RegExp-Kompatibilität.
- Lösungsansatz: Entweder TS-Target anheben oder RegExp auf target-kompatible Variante umstellen.

3. **TS-003**
- Befund: `server/services/documentHeaderDeterministicParser.ts:271` -> gleicher `TS1501`-Fehler.
- Vermutete Ursache: Gleiche Klasse von Inkompatibilität wie TS-002.
- Lösungskategorie: Toolchain/TS-Config oder RegExp-Kompatibilität.
- Lösungsansatz: Gleiches Vorgehen wie TS-002 konsistent für beide Stellen.

### Audit: Lint

4. **L-001**
- Befund: `client/src/App.tsx:34` `@typescript-eslint/no-floating-promises`.
- Vermutete Ursache: Promise wird ohne `await`/`void`/`catch` aufgerufen.
- Lösungsansatz: Promise explizit behandeln (`await`, `void`, oder Fehlerpfad).

5. **L-002**
- Befund: `client/src/components/AppointmentForm.tsx:1052` `no-misused-promises`.
- Vermutete Ursache: Async-Funktion direkt an Event-Prop mit `void`-Signatur gebunden.
- Lösungsansatz: Wrapper-Funktion mit internem Promise-Handling einsetzen.

6. **L-003**
- Befund: `client/src/components/CustomerData.tsx:568` `no-misused-promises`.
- Vermutete Ursache: Gleiches Muster wie L-002.
- Lösungsansatz: Event-Wrapper und sauberes Fehlerhandling.

7. **L-004**
- Befund: `client/src/components/ProjectForm.tsx:671` `no-misused-promises`.
- Vermutete Ursache: Gleiches Muster wie L-002.
- Lösungsansatz: Async-Handler entkoppeln.

8. **L-005**
- Befund: `client/src/components/calendar/CalendarYearView.tsx:41` `no-unused-vars` für `toast`.
- Vermutete Ursache: Toter Codepfad.
- Lösungsansatz: Entfernen oder aktive Nutzung herstellen.

9. **L-006**
- Befund: `client/src/hooks/useSettings.ts:4` `toastDesktopPositionValues` nur als Typ genutzt.
- Vermutete Ursache: Value-Import statt Type-only-Nutzung.
- Lösungsansatz: Typ-Import oder tatsächliche Runtime-Nutzung korrigieren.

10. **L-007**
- Befund: `client/src/pages/AdminSetup.tsx:57` `no-misused-promises`.
- Vermutete Ursache: Async-Eventhandler ohne Wrapper.
- Lösungsansatz: Synchronen Callback mit internem Promise-Handling verwenden.

11. **L-008**
- Befund: `client/src/pages/Login.tsx:183` `no-misused-promises`.
- Vermutete Ursache: Async-Handler direkt gebunden.
- Lösungsansatz: Wie L-007.

### Audit: Dependencies / Security

12. **SEC-001**
- Befund: `ajv <6.14.0` ReDoS (moderate).
- Vermutete Ursache: Transitiver Altstand.
- Lösungsansatz: Lockfile/Dependency-Update auf gefixte Version, Regressionstest auf Schema-Validierung.

13. **SEC-002**
- Befund: `minimatch` ReDoS (high), mehrere Pfade betroffen.
- Vermutete Ursache: Verwundbare transitive Versionen in Toolchain.
- Lösungsansatz: Abhängigkeitsbaum auf gefixte `minimatch`-Version heben und audit erneut prüfen.

14. **SEC-003**
- Befund: `rollup 4.0.0 - 4.58.0` Path Traversal / Arbitrary File Write (high).
- Vermutete Ursache: Verwundbarer Rollup-Stand.
- Lösungsansatz: Rollup auf gepatchte Version aktualisieren und Build-Pipeline gegenprüfen.

### Tests (aus `logs/vitest-junit.xml`, 33 Fehler)

15. **T-001**
- Befund: `ft01... UC 01/01 blocker` `NOT_IMPLEMENTED_BY_SCOPE` (Startzeit -> Standarddauer verifizierbar).
- Vermutete Ursache: API/Schema liefert keine prüfbare Dauerinvariante.
- Lösungsansatz: Verifizierbares Dauer-/Endzeit-Contract im Backend spezifizieren.

16. **T-002**
- Befund: `ft01... UC 01/13 blocker` `NOT_IMPLEMENTED_BY_SCOPE` (Tour-Color-Fallback-Contract).
- Vermutete Ursache: Keine validierte Semantik für ungültige/leere Farben im Contract.
- Lösungsansatz: Fallback-Regel serverseitig als festen Contract definieren.

17. **T-003**
- Befund: `ft01... UC 01/14 blocker` `NOT_IMPLEMENTED_BY_SCOPE` (historisches Delete für Admin).
- Vermutete Ursache: Delete-Regel erlaubt aktuell historischen Admin-Delete.
- Lösungsansatz: Historien-ReadOnly-Regel auch auf Admin-Delete anwenden (Contract-seitig).

18. **T-004**
- Befund: `employees.attachments` Oversize-Upload -> `socket hang up` statt sauberer Antwort.
- Vermutete Ursache: Upload-Limit/Error-Middleware beendet Verbindung ungeordnet.
- Lösungsansatz: Einheitliches Fehler-Mapping für Payload-Limits (explizit 413) etablieren.

19. **T-005**
- Befund: `employees.attachments` unknown employee upload -> 500 statt 404.
- Vermutete Ursache: Fehlende Vorabprüfung auf Fremdschlüssel/Existenz.
- Lösungsansatz: Existenzcheck vor Persistenz + konsistente 404-Übersetzung.

20. **T-006**
- Befund: `employees.attachments` DELETE-Blocking nicht erfüllt/absicherbar.
- Vermutete Ursache: Fehlender/unklarer Endpoint-Guard.
- Lösungsansatz: Expliziten Block-Handler/Routevertrag (403/405) definieren.

21. **T-007**
- Befund: `customers.visibility.by-role` Test 1 -> `Username already exists`.
- Vermutete Ursache: Testdatenkollision zwischen Fällen/Suites.
- Lösungsansatz: Deterministische, eindeutig namespacte Testdaten pro Testfall.

22. **T-008**
- Befund: `customers.visibility.by-role` Test 2 -> `Username already exists`.
- Vermutete Ursache: wie T-007.
- Lösungsansatz: wie T-007.

23. **T-009**
- Befund: `employees.lifecycle` READER-POST erwartet 403, erhält 201.
- Vermutete Ursache: Rollenprüfung auf Create-Pfad fehlt oder greift nicht.
- Lösungsansatz: Role-Guard auf POST /employees strikt erzwingen.

24. **T-010**
- Befund: `employees.visibility.by-role` Detail-Inaktiv-Test -> `Username already exists`.
- Vermutete Ursache: Testsetup kollidiert vor eigentlichem Assertion-Pfad.
- Lösungsansatz: Seed/Factory-Isolation und eindeutige Usernamen.

25. **T-011**
- Befund: `employees.visibility.by-role` Toggle-Test -> `Username already exists`.
- Vermutete Ursache: wie T-010.
- Lösungsansatz: wie T-010.

26. **T-012**
- Befund: `ft02 full uc` UC 02/12 als backendseitig nicht direkt verifizierbar markiert.
- Vermutete Ursache: Kein dedizierter Invariant-/Readback-Contract.
- Lösungsansatz: Contract-Testbarkeit durch expliziten Invariant-Endpunkt oder definierte Projektion erhöhen.

27. **T-013**
- Befund: `ft02 full uc` UC 02/19 analog `NOT_IMPLEMENTED_BY_SCOPE`.
- Vermutete Ursache: Traceability-Policy ohne direkt testbaren Backend-Beweis.
- Lösungsansatz: Testbare Backend-Invariante definieren.

28. **T-014**
- Befund: `ft02 full uc` UC 02/20 analog `NOT_IMPLEMENTED_BY_SCOPE`.
- Vermutete Ursache: wie T-013.
- Lösungsansatz: wie T-013.

29. **T-015**
- Befund: `ft04 full uc` UC 04/05 READER-Mutation auf tour-employee nicht blockiert.
- Vermutete Ursache: fehlender Role-Guard in betroffenen Controllerpfaden.
- Lösungsansatz: Autorisierungskontrakt für Mutationendpunkte schärfen.

30. **T-016**
- Befund: `ft04 full uc` UC 04/07 Wochenübersicht-Ableitung nicht verifizierbar.
- Vermutete Ursache: Keine dedizierte serverseitige Ableitungsinvariante.
- Lösungsansatz: Expliziten Contract für Wochenprojektion aus Tourzuordnung definieren.

31. **T-017**
- Befund: `ft05 full uc` UC 05/10 nicht testbar, DELETE-Endpoint fehlt.
- Vermutete Ursache: API bietet keinen Delete-Pfad für Mitarbeiter.
- Lösungsansatz: DELETE-Contract inkl. Referenzschutz (409) definieren oder UC offiziell de-scopen.

32. **T-018**
- Befund: `ft05 full uc` UC 05/12 nicht testbar, DELETE-Endpoint fehlt.
- Vermutete Ursache: wie T-017.
- Lösungsansatz: wie T-017 plus expliziter Role-Guard-Contract.

33. **T-019**
- Befund: `ft04 full uc` UC 04/07 `NOT_IMPLEMENTED_BY_SCOPE`.
- Vermutete Ursache: fehlender verifizierbarer Backend-Kontrakt.
- Lösungsansatz: dedizierte Projektion bzw. Testhaken definieren.

34. **T-020**
- Befund: `tourManagement.role-readonly.wiring` `NOT_IMPLEMENTED_BY_SCOPE` (UI darf 'Neue Tour' nicht rendern).
- Vermutete Ursache: fehlende UI-Rollenableitung im Produktionspfad.
- Lösungsansatz: UI-Rendering-Contract nach Rolle verbindlich festlegen.

35. **T-021**
- Befund: `ft05 full uc` deactivated employee assignable (201 statt 409/400).
- Vermutete Ursache: Aktivitätsprüfung fehlt in Appointment-Save.
- Lösungsansatz: Mitarbeiter-Statusvalidierung vor Zuordnung erzwingen.

36. **T-022**
- Befund: `ft05 full uc` UC 05/10 als MELDER wegen fehlendem Endpoint.
- Vermutete Ursache: wie T-017.
- Lösungsansatz: Endpoint ergänzen oder UC/Test auf bestehenden Vertrag anpassen.

37. **T-023**
- Befund: `ft05 full uc` UC 05/12 als MELDER wegen fehlendem Endpoint.
- Vermutete Ursache: wie T-018.
- Lösungsansatz: wie T-018.

38. **T-024**
- Befund: `projects.attachments` unknown project upload -> 500 statt 404.
- Vermutete Ursache: fehlendes Fehler-Mapping auf NotFound.
- Lösungsansatz: Existenzprüfung + kontrollierte 404-Antwort.

39. **T-025**
- Befund: `employees.attachments` READER upload -> 201 statt 403.
- Vermutete Ursache: Role-Guard fehlt/inkonsistent.
- Lösungsansatz: Schreiboperationen rollenbasiert blockieren.

40. **T-026**
- Befund: `projects.delete.rules` erwartete Delete-Fehler, tatsächlich `CUSTOMER_NUMBER_CONFLICT`.
- Vermutete Ursache: Test-Preconditions kollidieren (Customer-Erzeugung nicht isoliert).
- Lösungsansatz: Test-Factory mit kollisionsfreien Kundennummern.

41. **T-027**
- Befund: `projects.detail.aggregate-contract` Property `projectStatuses` fehlt im Response.
- Vermutete Ursache: Response-Shape driftet gegenüber Testcontract.
- Lösungsansatz: Contract angleichen (Entweder API ergänzt Feld oder Test/Spec präzisiert neues Shape).

42. **T-028**
- Befund: `projects.scope.mengenlogik` bricht mit `Datum in der Vergangenheit`.
- Vermutete Ursache: Zeitabhängiger Testdatensatz ist veraltet/historisch.
- Lösungsansatz: Relative Datumsfixture (future-safe) und ggf. fixed clock im Integrationstest.

43. **T-029**
- Befund: `projects.attachments` READER upload -> 201 statt 403.
- Vermutete Ursache: fehlender Role-Guard am Projekt-Attachment-Upload.
- Lösungsansatz: Autorisierung auf Endpoint-Ebene erzwingen.

44. **T-030**
- Befund: `projectStatus.relations` Test 1 -> `CUSTOMER_NUMBER_CONFLICT`.
- Vermutete Ursache: Datensatzkollision in `createProjectForTest`.
- Lösungsansatz: eindeutige Customer-Identitäten pro Testfall/Suite.

45. **T-031**
- Befund: `projectStatus.relations` Test 2 -> `CUSTOMER_NUMBER_CONFLICT`.
- Vermutete Ursache: wie T-030.
- Lösungsansatz: wie T-030.

46. **T-032**
- Befund: `projectStatus.relations` Test 3 -> `CUSTOMER_NUMBER_CONFLICT`.
- Vermutete Ursache: wie T-030.
- Lösungsansatz: wie T-030.

47. **T-033**
- Befund: `tourManagement.role-readonly.wiring` als `NOT_IMPLEMENTED_BY_SCOPE` fehlgeschlagen.
- Vermutete Ursache: UI-Role-Restriction im Contract nicht implementiert.
- Lösungsansatz: Produktentscheidung: Entweder Verhalten implementieren oder Test als Scope-Exclusion kennzeichnen/entkoppeln.

## Zusatzbeobachtungen (nicht als Fehler gezählt)

- ESLint-Konfiguration nutzt Legacy `.eslintrc`-Pfad (Deprecation-Warnung Richtung ESLint v10).
- In Testlauf erschien TLS-Warnung (`NODE_TLS_REJECT_UNAUTHORIZED=0`), sicherheitlich nur in kontrollierter Testumgebung tolerierbar.

## Priorisierte redaktionelle Abarbeitung (ohne Fixes)

1. Kritische Authorization-Lücken (T-009, T-025, T-029, T-021) und High-Vulns (SEC-002, SEC-003).
2. Build-/Gate-Blocker (TS-001..003, L-001..008).
3. 500/Status-Mapping-Fehler in Attachment-Flows (T-004, T-005, T-024).
4. Testdaten-Isolation stabilisieren (T-007, T-008, T-010, T-011, T-026, T-030..032).
5. Scope-/Contract-Lücken als Produktentscheidungen klären (T-001, T-002, T-003, T-012..020, T-022, T-023, T-033).
