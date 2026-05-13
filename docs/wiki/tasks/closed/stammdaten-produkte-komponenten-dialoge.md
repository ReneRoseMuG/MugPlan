# Stammdaten-, Produkte- und Komponenten-Dialoge

Dialog-, Auswahl-, Bestätigungs- und Meldungspfade für Produkte, Komponenten, Kategorien und Stammdatenlisten einheitlich strukturieren. Die Aufgabe ist Teil von P-01 Schritt 4 und richtet sich auf einfache Erfassungs-, Auswahl- und Löschpfade im FT-27-Stammdatenbereich.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Auswahl-, Bestätigungs- und Meldungspfade für Produkte, Komponenten, Kategorien und Stammdatenlisten einheitlich strukturieren.

## Ausgangslage

Die Produkt- und Komponentenpflege nutzt bereits FT-27-Endpunkte mit serverseitiger Admin-Durchsetzung. Im Frontend waren mehrere Produkt-, Komponenten- und Kategorieaktionen noch über native Browser-Bestätigungen oder einfache Dialoge verdrahtet, statt die gemeinsame Dialogbasis des P-01-Rollouts zu verwenden.

## Umfang

- Produkt- und Komponenten-Anlagedialoge nutzen die gemeinsame Dialogbasis.
- Produktauswahl- und Komponentenauswahldialoge nutzen im Dialogmodus die gemeinsame Dialogbasis.
- Produkt-, Komponenten- und Kategorie-Löschpfade laufen über gemeinsame Bestätigungsdialoge statt über native Browser-Confirm-Pfade.
- Fehlermeldungen aus Stammdatenmutationen werden sichtbar im Stammdatenbereich oder im betroffenen Dialog angezeigt.
- Nicht Teil der Aufgabe sind neue FT-27-Endpunkte, Schemaänderungen, Produktlogik außerhalb der bestehenden Stammdatenpflege oder eine Änderung der Rollenregeln.

## Umsetzungshinweise

- `ADMIN` darf Produkte, Komponenten und Kategorien anlegen, bearbeiten, importieren und löschen.
- `DISPONENT` und `LESER` erhalten keine neuen Mutationsmöglichkeiten; bestehende Auswahl- und Lesepfade dürfen nicht ausgeweitet werden.
- Die serverseitige Durchsetzung bleibt in `server/services/masterDataService.ts` maßgeblich; UI-Ausblendungen sind nur Bedienführung.
- Die bestehenden API-Contracts und React-Query-Invalidierungen bleiben erhalten.
- `client/src/components/ui/product-create-dialog.tsx`
- `client/src/components/ui/component-create-dialog.tsx`
- `client/src/components/ui/product-selection-dropdown.tsx`
- `client/src/components/ui/component-dropdown.tsx`
- `client/src/components/ui/all-component-list.tsx`
- `client/src/components/ProductManagementPage.tsx`

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Produkt-, Komponenten- und Kategoriepfade nutzen die gemeinsame Dialogstruktur für Anlage, Auswahl und Löschbestätigung. Native Browser-Confirm-Pfade in den bearbeiteten Stammdatenkomponenten wurden ersetzt, Produktanlagen übernehmen Shortcode und Beschreibung korrekt.
- Automatisierte Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/productDropDown.behavior.test.tsx tests/unit/ui/allComponentList.shortcode-labels.test.tsx`; `npm run test:integration -- tests/integration/server/masterData.ft27.integration.test.ts tests/integration/server/masterData.visibility.by-role.test.ts --reporter=verbose`; `npm run check:encoding`; `git diff --check`.
- App-Prüfung: Abschluss durch Nutzer am 09.05.26 bestätigt.
- Verwendete Testdaten: synthetische FT-27-Produkte, Komponenten, Kategorien und Rollen-Agents aus Unit- und Integrationsfixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern und bestehenden Warnungsgruppen ausgeführt.
- Verbleibende Lücken: Keine für P-01 Schritt 4.
- Folgeaufgaben: Tags-Dialoge folgen als nächster P-01-Schritt.

---

## Beziehungen

- Features: [FT-27 - Produktverwaltung und Auftragspositionen](../../features/ft-27-produktverwaltung-und-auftragspositionen/ft-27-produktverwaltung-und-auftragspositionen.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Stammdaten-, Produkte- und Komponenten-Dialoge abgeschlossen](../../journal/09-05-26-p01-stammdaten-produkte-komponenten-dialoge-abgeschlossen.md)
