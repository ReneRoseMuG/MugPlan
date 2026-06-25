# MS-68 — Flache Kundenadressspalten vollständig als Quelle entkoppelt

Datum: 24.06.26
Branch: `merge/ms68-ms52`
Auftragsklasse: 5 (mehrschichtige Änderung über Contract/Schema, Service, Repository, Seed, Systemkunde und Tests)

---

## 1. Zweck und Auftrag

Folgeauftrag zum Adressmodell-Umzug (siehe `2026-06-24_ms68-adressmodell-objektbindung-tabs.md`). Ein Audit der Lese- und Schreibpfade ergab, dass das Adressobjekt im Client zwar bereits die einzige Quelle ist, serverseitig aber vier Restpfade weiterhin die flachen `customers.address_*`-Spalten benutzten. Der Anwender hat entschieden:

1. Der Schreib-Spiegel in die flachen Spalten bleibt aktiv (Backup), solange die Adressdaten primär ins Adressobjekt gehen.
2. Es darf systemweit keine Quelle mehr geben, die als Adressquelle auf die flachen Kundenspalten zugreift — auch keine Suchparameter.
3. Der Excel-Export bleibt unverändert (Rohdaten-Backup, vernachlässigbar).
4. Der Abwesenheits-Systemkunde soll eine echte Adresszeile im Adressobjekt bekommen.

Zusätzlich entschieden: Der Kunden-Contract wird „sauber" geschnitten — die flachen Adressfelder werden ganz aus dem Insert/Update-Contract entfernt (nicht nur ignoriert).

---

## 2. Befunde des Audits (vor der Umsetzung)

- **Schreibpfad (falsche Richtung, aktiv):** `customersService.create/updateCustomer` normalisierten weiter `addressLine1..country` und reichten sie ans Repository; `createCustomer` rief immer `syncBillingAddress` (flache Felder → BILLING-Zeile als Quelle). Im UI tot (Client sendet keine Adressfelder mehr), aber über den Contract erreichbar.
- **Einzelleser ohne Resolver:** `getCustomer` und `getCustomersByCustomerNumber/ExactDisplayName/ExactNameParts` selektierten `db.select().from(customers)` → rohe flache Adressspalten im DTO.
- **Suchparameter:** Eine Backend-Suche nach direkten Query-Zugriffen auf `customers.address_*` ergab null Treffer. Die PLZ-Tourensuche matcht über `listAppointmentsForCalendarRange`, das den Resolver `customerSelectWithEffectiveAddress()` nutzt — also bereits objektbasiert.
- **Abwesenheits-Pseudokunde + Seed:** schrieben ihre Adresse direkt in die flachen Spalten, ohne `customer_address`-Zeile.

---

## 3. Umsetzung

### Contract/Schema (`shared/schema.ts`)
- `insertCustomerSchema` und `updateCustomerSchema` entfernen `addressLine1`, `addressLine2`, `postalCode`, `city`, `country` (per `.omit` bzw. Weglassen). Da der Contract-Index (`shared/routes.ts`) diese Schemas direkt referenziert, propagiert die Änderung automatisch. Der Customer-Endpoint nimmt damit keine flachen Adressfelder mehr an (sie werden von Zod stillschweigend entfernt).

### Repository (`server/repositories/customersRepository.ts`)
- `syncBillingAddress` → `upsertBillingAddressRowTx`: legt die BILLING-Zeile nur noch aus **explizit** übergebenen Werten an/aktualisiert sie (kein Bezug auf flache Eingabefelder). Default: leere Zeile.
- `createCustomer(data, options?: { billingAddress? })`: Der API-Pfad übergibt keine Adresse → leere BILLING-Zeile, die der Client per PATCH befüllt. System-/Seed-Kunden übergeben ihre Adresse explizit; dann werden die flachen Spalten als Spiegel mitgeschrieben.
- `updateCustomerWithVersion`: fasst keine Adressspalten mehr an, kein `syncBillingAddress`-Aufruf.
- Neue `applyBillingAddressMirrored(customerId, fields)`: setzt die BILLING-Zeile eines bestehenden Kunden (upsert) und spiegelt sie in die flachen Spalten — ausschließlich für interne System-/Seed-Pfade.
- `getCustomer` und die drei Matcher nutzen jetzt `customerSelectWithEffectiveAddress()` → liefern die wirksame Lieferadresse aus dem Objekt.

### Service (`server/services/customersService.ts`)
- Adress-Normalisierung in `create/updateCustomer` entfernt (es gibt keine Adressfelder mehr im Contract-Typ).

### Systemkunde + Seed
- `employeeAppointmentAbsencesService.ensureAbsenceCustomer`: legt den Systemkunden über `createCustomer(..., { billingAddress })` an → echte BILLING-Zeile.
- `systemSeedService.applyCustomerDefinition`: Create über `billingAddress`, Update über `applyBillingAddressMirrored`.

### `mirrorBillingAddressToCustomerColumns` bleibt unverändert
- Der Backup-Spiegel (Objekt → flache Spalten) bei Pflege der Rechnungsadresse über die Adress-API bleibt wie zuvor.

---

## 4. Architektur- und Designentscheidungen

- **Quelle ist ausschließlich das Adressobjekt:** Eingaberichtung ist Adress-API → `customer_address` → (Spiegel) flache Spalten. Die flachen Spalten sind reiner Write-Only-Spiegel (Anwendervorgabe als Backup/Rollback-Netz).
- **Contract sauber geschnitten:** Die flachen Adressfelder sind ganz aus dem Kunden-Contract entfernt, statt sie nur stillschweigend zu ignorieren — kein missverständlicher Contract.
- **Interner Adressparameter statt flacher Eingabefelder:** `billingAddress` bei `createCustomer` und `applyBillingAddressMirrored` sind interne Schreibwege für System-/Seed-Kunden; sie zielen primär auf das Adressobjekt und spiegeln nur. Damit ist kein API-Pfad mehr in der Lage, die BILLING-Zeile aus flachen Eingabefeldern zu überschreiben.
- **BILLING-Zeile bei Neuanlage garantiert:** Jeder neue Kunde erhält weiterhin eine (leere) systemgepflegte Rechnungsadress-Zeile — Verhalten wie zuvor, nur ohne flache Eingabequelle.

---

## 5. Betroffene Dateien

Server / Shared:
- `shared/schema.ts` — Adressfelder aus `insertCustomerSchema`/`updateCustomerSchema` entfernt.
- `server/repositories/customersRepository.ts` — `upsertBillingAddressRowTx`, `applyBillingAddressMirrored`, `createCustomer(billingAddress)`, `updateCustomerWithVersion` ohne Adresse, Einzelleser auf Resolver.
- `server/services/customersService.ts` — Adress-Normalisierung entfernt.
- `server/services/employeeAppointmentAbsencesService.ts` — Systemkunde mit BILLING-Adresszeile.
- `server/services/systemSeedService.ts` — Seed-Adresse über das Adressobjekt.

Tests:
- `tests/helpers/testDataFactory.ts` — Adress-Overrides über die BILLING-Zeile (`applyBillingAddressMirrored`).
- `tests/unit/validation/customerContractAddressFields.test.ts` (neu) — Schema-Strip-Nachweis.
- `tests/unit/services/customersService.country-forwarding.test.ts` (gelöscht) — prüfte das entfernte Forwarding.
- `tests/unit/services/systemSeedService.test.ts` — Mock um `applyBillingAddressMirrored` erweitert, Erwartungen an neue Aufrufform.
- `tests/integration/server/customerAddresses.integration.test.ts` — neuer Nachweis „Create-Contract ignoriert flache Adressfelder".
- `tests/unit/ui/customerData.layoutShellIntegration.test.tsx` — verwaiste `input-country`/`label-country`-Erwartungen auf `customer-addresses-panel` umgestellt (Test war durch die frühere UI-Umstellung bereits rot).

Doku:
- `docs/TEST_MATRIX.md` — Einträge gepflegt.

---

## 6. Tests und Verifikation

- `npm run check` (Encoding, `tsc`, Lint): grün.
- `npm run test:unit -- customerContractAddressFields`: 2/2.
- `npm run test:unit -- systemSeedService`: 18/18.
- `npm run test:unit -- customerData.layoutShellIntegration`: 3/3.
- `npm run test:integration -- customerAddresses --reporter=verbose`: 8/8 (inkl. neuem Contract-Ignore-Nachweis).
- `npm run test:integration -- admin.system-seed employeeAppointmentAbsences admin.dump --reporter=verbose`: 36/36.

Belegte fachliche Aussagen: Ein Kunden-Create mit flachen Adressfeldern legt sie nicht als Quelle an, der neue Kunde hat eine leere systemgepflegte Rechnungsadresse, und `getCustomer` liefert die wirksame Lieferadresse aus dem Objekt; der Systemkunde und Seed-Kunden bekommen ihre Adresse über das Adressobjekt; der Dump-Roundtrip der abweichenden Lieferadresse bleibt korrekt.

---

## 7. Bekannte Einschränkungen und offene Punkte

- **Excel-Export bleibt** (`backupRuntimeRepository.listAllCustomers` liest roh aus `customers`) — bewusste Anwendervorgabe (Rohdaten-Backup).
- **Flache Spalten serverseitig** bleiben erhalten (non-destruktiv) und werden nur noch als Spiegel der Rechnungsadresse geschrieben.
- **Hausnummer** weiterhin separater, späterer Auftrag.
- **Voller Audit/Testlauf** nach Abschnitt 13 auf Wunsch separat ausgeführt; Ergebnisse im Chat berichtet.
- **Push/Commit** nur auf ausdrücklichen Wunsch.

---

## 9. Nachtrag (gleicher Tag): Adress-Backend als einzige Schreibstelle, optionale Felder, ProjectForm-Fix

Auf Nutzerentscheidung folgte ein architektonischer Umbau, der zwei im ersten Durchgang noch unsaubere Punkte korrigiert.

**Adress-Schreibweg gebündelt:** Das Kunden-Repository schrieb die Rechnungsadress-Zeile bisher direkt in die Adresstabellen (Schichtenbruch, umging das Adress-Backend) und übersprang bei fehlender Pflichtkategorie still. Neu: `customerAddressesRepository.ensureBillingAddressTx(tx, customerId, fields?)` ist die einzige Schreibstelle der Rechnungsadresse (transaktionsfähig, atomar mit dem Kunden-Insert); fehlt die BILLING-Kategorie, gibt es jetzt einen klaren Fehler statt stillem Überspringen. `customersRepository` (createCustomer, applyBillingAddressMirrored) ruft nur noch diese Funktion; `upsertBillingAddressRowTx` entfällt. Die flache Spiegelung bleibt im Kunden-Repository (eigene Tabelle).

**Adressfelder optional (Nutzervorgabe „für jede Adresse"):** Straße/PLZ/Ort/Land im `insert/updateCustomerAddressSchema` von Pflicht (`addressRequiredTextSchema`) auf optional gestellt. Das Adressobjekt bleibt Pflicht (jeder Kunde bekommt zwingend eine Rechnungsadresse), seine Felder dürfen leer/teilweise sein. Damit ist ein Kunde ohne Adresseingabe sauber anlegbar.

**Produktiv-Bug behoben (vom Browser-Test aufgedeckt):** Der Projekt-Dokumentextraktions-Flow (`ProjectForm.createCustomerFromDraft` / `updateExistingCustomerFromDraft`) legte die Kundenadresse noch über den entfernten flachen Contract an — die Adresse ging verloren. Jetzt: Stammdaten über den Kunden-Contract, Adresse über das Adress-Backend (Rechnungsadress-Zeile per PATCH; Backfill in Stammdaten- und Adressteil getrennt).

**Gruppe-A-Testfixes:** Tests, die Kundenadressen über den entfernten Direktpfad (`POST/PATCH /api/customers` mit Adressfeldern) setzten, auf die Adress-API umgestellt (entity-card-payload appointments/customers/projects, calendar.tour-postal-plan, tour-print-preview, documentExtraction.projectConflictFlow; Browser entity-card-preview-freshness, reader-form-data-visibility, reader-customer-readonly, project-form). Neuer Integrationstest „akzeptiert eine teilweise oder leere Adresse".

**Verifikation:** `npm run check` grün; Unit 1450 grün; Integration der betroffenen Pfade 68/68 grün; Gruppe-A-Browsertests grün.

## 10. Attachment-Bestandsbug behoben (eigener Commit `7beb5b12`, unabhängig von MS-68)

Im Duplikat-Projekt-Edit-Flow wurde ein extrahiertes Dokument-Attachment beim Speichern eines bestehenden Projekts nicht dauerhaft verknüpft (`project-form.create-sidebar-persistence` „opens an existing project in edit mode for duplicate…"). Per Stash-Verifikation belegt: Der Fehler trat auch ohne die MS-68-Änderungen auf — eigenständiger Bestandsbug.

**Ursache (per Netzwerk-Diagnose):** Das Attachment wird korrekt hochgeladen (`POST …/attachments` → 201), aber der Edit-Save-Pfad invalidierte — anders als der Neu-Projekt-Pfad — die Attachment-Query nicht. Beim erneuten Öffnen zeigte der Sidebar daher den leeren Cache.

**Fix:** Eine `queryClient.invalidateQueries`-Zeile im Edit-Pfad (`ProjectForm.tsx`), analog zum Create-Pfad.

**Verifikation:** Zuvor roter Test grün; gesamte `project-form`-Browser-Suite 26/26 grün; `npm run check` grün. Committet als `7beb5b12`, gepusht auf `merge/ms68-ms52`.
