# MS-68 — Adressmodell auf Objektbindung umgestellt + Kundenformular mit Adress-Tabs

Datum: 24.06.26
Branch: `merge/ms68-ms52`
Auftragsklasse: 5 (mehrschichtige Änderung über UI, Frontend-State, API-Nutzung, Dump/Restore und Tests)

---

## 1. Zweck und Auftrag

Ausgangspunkt war die Kritik am bestehenden Adress-UI des Kundenformulars (WIKI-157 / FT 09): Die Lösung war für Anwender unverständlich. Oben gab es einen Block „Rechnungsadresse" (an die flachen Kundenfelder gebunden), darunter ein zweites Panel „Lieferadresse & weitere Adressen", das dieselbe Rechnungsadresse noch einmal als read-only Zeile mit dem Etikett „oben im Formular pflegen" zeigte, plus den internen Begriff „wirksame Lieferadresse".

Das fachliche Ziel war zweigeteilt:
1. **Architektur:** Sämtliche Kunden-Adressdaten sollen aus dem Adressobjekt (`customer_address`) kommen. Die flachen Adress-Spalten am Kunden (`customer.address_line1` usw.) sollen nirgends mehr als Quelle verwendet werden. Vorgabe des Anwenders: keine destruktive Migration, das `customer`-Objekt bleibt wie es ist — die flachen Spalten bleiben erhalten und werden nur noch als Spiegel mitgeführt.
2. **UI:** Das Kundenformular stellt die verschiedenen Adressen als horizontale Tabs dar. Jeder Tab ist an ein Adressobjekt gebunden. Solange es nur eine Adresse gibt, ist sie zugleich Rechnungs- und Lieferadresse; sobald eine zweite Adresse der Kategorie Lieferadresse existiert, gilt diese als Lieferadresse.

---

## 2. Ausgangslage und Befunde (Analyse vor der Umsetzung)

- **Anzeige war bereits umgestellt:** Termine, Termin-Previews, Reports, Projekt-Anzeige, Board, Kundenliste und der Termin-Export lesen die fünf Adressfelder über `customerSelectWithEffectiveAddress()` (serverseitige Auflösung der wirksamen Lieferadresse aus `customer_address`). Eine Suche nach `customers.addressLine1/postalCode/city/country` als Einzelspalte ergab serverseitig null Treffer außerhalb des Resolvers.
- **Pflichtfeldvalidierung war bereits vorhanden:** `insertCustomerAddressSchema`/`updateCustomerAddressSchema` nutzen `addressRequiredTextSchema` (`z.preprocess(trim, z.string().min(1))`) für Straße/PLZ/Ort/Land. Sie wurde daher NICHT neu gebaut.
- **Dump-Lücke (kritisch):** Der DB-Dump (`dumpService.ts`, `DUMP_TABLE_ENTRIES`) ist eine fest einprogrammierte Tabellenliste. Darin fehlten vier Tabellen: `address_category`, `customer_address`, `journal_entry`, `journal_entry_context`. Ein Dump sicherte die Adressen also nicht; ein Restore hätte den Adressbestand zerstört. Es gab keinen Dump-Test, der die Adress-Tabellen abdeckte.
- **Falsche Schreibrichtung im Formular:** Die Rechnungsadresse wurde im Formular weiterhin über die flachen Kundenfelder gepflegt (formData → Kunden-Update → `syncBillingAddress`: flache Felder → BILLING-Zeile). Damit waren die flachen Spalten die Quelle — entgegen dem Ziel. Dieser Punkt wurde erst nach einer Rückfrage des Anwenders erkannt und korrigiert.

---

## 3. Umsetzung in Phasen

### Phase 1 — Dump/Restore vervollständigt (Commit `041f79e4`)
- `address_category`, `customer_address`, `journal_entry`, `journal_entry_context` in `DUMP_TABLE_ENTRIES` aufgenommen, in fremdschlüssel-korrekter Reihenfolge (Katalog vor Adressen, Adressen nach Kunden, Journaleintrag vor Journalkontext).
- Import-Semantik verallgemeinert: Im Dump fehlende Tabellen werden beim Import nicht mehr geleert, sondern unangetastet gelassen (vorher nur `users` geschützt). Dadurch zerstört ein Alt-Dump nicht die Pflicht-Adresskategorien.
- Neuer Invariantentest `tests/unit/invariants/dumpTableCoverage.invariant.test.ts`: gleicht die Dump-Liste gegen alle im Schema definierten Tabellen ab. Eine künftig vergessene Tabelle lässt den Test rot werden. Das ist die strukturelle Absicherung gegen genau diese Lückenklasse.
- `admin.dump.integration.test.ts` um einen Lieferadress-Roundtrip (Identitätsnachweis) und den Alt-Dump-Katalogschutz erweitert; `collectSnapshot` um Adress-Tabellen ergänzt.

### Phase 2 — Schreibpfad / Adress-Service (Commit `f2326d0c`)
- Die Rechnungsadress-Zeile (Kategorie BILLING) ist jetzt über die Adress-API pflegbar (`updateAddress`): Felder editierbar, aber Rollenwechsel verboten und nicht löschbar.
- Neue Repository-Funktion `mirrorBillingAddressToCustomerColumns`: spiegelt eine Änderung der BILLING-Zeile zurück in die flachen Kundenfelder (Adresszeile = Quelle, flache Felder = Spiegel). Die Kunden-`version` wird dabei bewusst nicht erhöht (reine Spiegelung).
- Adress-Integrationstest um Rechnungsadress-Pflege mit Spiegel-Nachweis und Rollenwechsel-Schutz erweitert.

### Phase 4 — UI: Adress-Tabs (Commit `b8188879`, erste Fassung)
- Der obere „Rechnungsadresse"-Block und das untere Panel wurden durch einen einheitlichen Tab-Adressbereich ersetzt.
- Tab-Benennung statt Jargon: „Rechnungs- und Lieferadresse", solange keine separate Lieferadresse existiert, sonst „Rechnungsadresse" + eigener „Lieferadresse"-Tab. Der Begriff „wirksame Lieferadresse" verschwindet aus der Oberfläche.
- Variante A: alle Adressen werden als Entwurf gesammelt und gemeinsam mit dem großen „Speichern" übernommen — auch bei der Neuanlage.
- Prüfbare Logik (Benennung, Speicherplan, Vollständigkeit) in `client/src/lib/customer-addresses.ts` ausgelagert und per Unit-Test abgesichert (kein DOM-Testumfeld vorhanden).
- **Einschränkung dieser ersten Fassung:** Die Rechnungsadresse hing noch an den flachen formData-Feldern — falsche Richtung.

### Phase 4 — Richtungs-Korrektur (Commit `71b9a106`)
- Umbau auf ein einheitliches Draft-Array: Jeder Tab — auch die Rechnungsadresse — ist an seine `customer_address`-Zeile gebunden.
- Laden: alle Adressen über die Adress-API. Speichern: Rechnungsadresse per PATCH auf die Adresszeile; das Kunden-Update sendet keine Adressfelder mehr.
- Neuanlage: Kunde ohne Adressfelder anlegen, die serverseitig frisch erzeugte Rechnungsadress-Zeile direkt über die Adress-API befüllen.
- Dokumentextraktion füllt den Rechnungsadress-Entwurf statt der flachen formData-Felder.
- Browser-E2E um einen Beweis erweitert, dass eine Rechnungsadress-Änderung im Tab über das Adressobjekt bis in die Terminkarte durchschlägt.

### Restumstellung — Dokumentextraktion (Commit `02635b75`)
- Findet die Dokumentextraktion einen bestehenden Kunden per Nummer, liest sie dessen Rechnungsadresse jetzt aus der Adress-API (BILLING-Zeile) statt aus den flachen Feldern. Damit verwendet auch der letzte Vorbefüllungs-Pfad keine flachen Spalten mehr.

---

## 4. Architektur- und Designentscheidungen

- **Non-destruktiv:** Keine Spalten gedroppt, keine destruktive Migration. Die flachen Spalten bleiben erhalten und werden als Spiegel der Rechnungsadresse mitgeführt — Anwendervorgabe und zugleich Rückfall-Netz.
- **Adresszeile als Quelle:** Lesen und Schreiben der Rechnungsadresse laufen über die Adress-API; die Spiegelung (`mirrorBillingAddressToCustomerColumns`) hält die flachen Felder nach. Das Kunden-Update fasst keine Adressfelder mehr an.
- **Variante A (gemeinsames Speichern):** Bewusst gegenüber „weitere Adressen sofort speichern" gewählt, weil genau die Uneinheitlichkeit (Rechnungsadresse anders als weitere) das ursprüngliche Verständnisproblem war. Ermöglicht zudem das Erfassen weiterer Adressen bereits bei der Neuanlage.
- **Benennung statt Jargon:** Die Regel „eine Adresse = Rechnungs- und Lieferadresse zugleich" steckt in der Tab-Beschriftung, nicht in einem technischen Badge.
- **Logik in node-testbaren Helfern:** Da kein DOM-Testumfeld existiert, liegt die prüfbare Logik in `customer-addresses.ts` (Benennung, Speicherplan, Vollständigkeit) und wird per Unit-Test abgesichert; die sichtbare Wirkung über Browser-E2E.
- **Invariantentest gegen Wiederholung:** Der Abgleich Dump-Liste ↔ Schema verhindert, dass künftige Tabellen unbemerkt aus dem Backup fallen.

---

## 5. Betroffene Dateien

Server:
- `server/services/dumpService.ts` — Tabellenliste + Import-Semantik für fehlende Tabellen.
- `server/repositories/customersRepository.ts` — `mirrorBillingAddressToCustomerColumns`.
- `server/services/customerAddressesService.ts` — BILLING-Zeile pflegbar, Rollenwechsel-Schutz, Spiegelung.

Client:
- `client/src/lib/customer-addresses.ts` — neue, node-testbare Logik (Typen, Benennung, Speicherplan, Vollständigkeit).
- `client/src/components/CustomerAddressesPanel.tsx` — komplett neu als controlled Tab-Komponente (einheitliches Draft-Array).
- `client/src/components/CustomerData.tsx` — Adress-Drafts als State, Laden/Speichern über die Adress-API, Dokumentextraktion in den Rechnungsadress-Entwurf, alter „Rechnungsadresse"-Block entfernt, verwaister `MapPin`-Import entfernt.

Tests:
- `tests/unit/invariants/dumpTableCoverage.invariant.test.ts` (neu)
- `tests/unit/ui/customerAddresses.tabModel.test.ts` (neu)
- `tests/integration/server/admin.dump.integration.test.ts` (erweitert)
- `tests/integration/server/customerAddresses.integration.test.ts` (erweitert)
- `tests/e2e-browser/ms68-delivery-address-consumers.browser.e2e.spec.ts` (erweitert: 3 Tests)

Doku:
- `docs/TEST_MATRIX.md` (gepflegt, siehe Einschränkung unten).

---

## 6. Commits

| Commit | Inhalt |
|---|---|
| `041f79e4` | Dump: Adress-/Journaltabellen + Alt-Dump-Schutz + Invariantentest |
| `f2326d0c` | Schreibpfad: Rechnungsadresse über Adress-API pflegbar + Spiegelung |
| `b8188879` | UI: Adress-Tabs (erste Fassung) |
| `71b9a106` | Richtungs-Korrektur: alle Tabs ans Adressobjekt gebunden |
| `02635b75` | Restumstellung: Dokumentextraktion liest Adressobjekt |

---

## 7. Tests und Verifikation

- `npm run check` (Encoding, `tsc`, Lint): grün.
- `npm run test:unit -- dumpTableCoverage.invariant`: 3/3.
- `npm run test:unit -- customerAddresses.tabModel`: 6/6.
- `npm run test:unit -- dump` (alle Dump-Unit-Tests, Regression): 26/26.
- `npm run test:integration -- admin.dump`: 16/16.
- `npm run test:integration -- customerAddresses`: 7/7.
- `npm run test:e2e:browser -- ms68-delivery-address-consumers`: 3/3.

Belegte fachliche Aussagen: Ein Dump sichert eine abweichende Lieferadresse und stellt sie per Identität wieder her; ein Alt-Dump leert den Adresskatalog nicht; die Rechnungsadress-Zeile ist pflegbar und wird in die flachen Felder gespiegelt, behält aber ihre Rolle; die Tab-Benennung wechselt korrekt; eine Rechnungsadress-Änderung im Tab schlägt über das Adressobjekt bis in die Terminkarte durch.

---

## 8. Bekannte Einschränkungen und offene Punkte

- **`docs/TEST_MATRIX.md` ist nicht committet.** Die Datei enthält fremde Änderungen aus dem parallelen Termin-/Mitarbeiter-Auftrag desselben Branches. Meine Doku-Zeilen (Dump, Adressen, Tabs) sind darin gepflegt, konnten aber ohne interaktives Patch-Staging nicht isoliert von den Fremdzeilen committet werden. Sollte zusammen mit dem Termin-Auftrag committet werden.
- **Hausnummer als eigenes Feld:** Die Spec nennt eine separate Hausnummer; Schema und UI kennen nur „Straße" (inkl. Nr.). Bewusst als eigener, späterer Auftrag offen gelassen.
- **Flache Spalten serverseitig:** Sie bleiben (Anwendervorgabe) und werden als Spiegel der Rechnungsadresse geschrieben; `getCustomer` liefert sie weiterhin im DTO mit, aber kein Konsument nutzt sie noch als Adressquelle.
- **Push ausstehend** (nur auf ausdrücklichen Wunsch).
- **Voller Audit/Testlauf** nach Abschnitt 13 wurde nicht ausgeführt — bisher nur die direkt betroffenen Tests.
