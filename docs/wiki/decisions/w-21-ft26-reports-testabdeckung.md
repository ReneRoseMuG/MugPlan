# W-21 - FT-26 Reports: verbleibende Testabdeckung

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: FT-26 Auswertungen und Reports
- Entdeckt: 05.05.26
- Art: Technische Schuld

## Befund

Für FT-26 Auswertungen und Reports liegt ein Auftrag zur Verbesserung der Testabdeckung rund um Vorlaufliste, Produktionsplanung, Auftragsliste, Tourenplan und Preset-Infrastruktur vor.

Der ursprüngliche Auftrag nennt außerdem einen Fehler rund um `availableSaunaModels` und den Sauna-Modell-Filter sowie Tests im Zusammenspiel mit Tags. Diese Punkte sind nach aktuellem Stand bereits gelöst und werden in dieser offenen Decision nicht mehr als umzusetzen geführt.

Offen bleiben aus dem Auftrag vor allem die übrigen Test- und Absicherungsfragen:

- Gibt es für die Auftragsliste einen Druckvorschau-Endpunkt analog zur Vorlaufliste?
- Falls ja, fehlt ein Integrationstest für vollständige Druckausgabe ohne Paging und Rollenmatrix.
- Die Preset-Aktion `OPEN_PRINT_PREVIEW` ist für die Auftragsliste nur dann sinnvoll end-to-end zu testen, wenn ein echter Druckvorschau-Endpunkt existiert.
- Beim Tourenplan ist das serverseitige Verhalten von `includeWithoutTour` gezielt zu prüfen, weil ein Test gegen einen tourgebundenen Print-Endpunkt den Filtereffekt für Termine ohne Tourzuordnung nicht belegt.
- Die in `docs/TEST_MATRIX.md` genannte Datei `tests/unit/settings/useSettings.auftragsliste.test.ts` fehlt laut Auftrag und sollte mit den zuständigen Frontend-Resolvern abgeglichen werden.

## Optionen

- A) Nur die verbleibenden, noch offenen FT-26-Testlücken gezielt analysieren und schließen.
- B) Den ursprünglichen Gesamtauftrag erneut vollständig prüfen, aber bereits gelöste Sauna-Modell- und Tag-Punkte ausdrücklich als erledigt ausklammern.
- C) Die offenen Punkte bis zur nächsten funktionalen Änderung an FT-26 zurückstellen.

## Betroffene Bereiche bei Umsetzung

Betroffen wären voraussichtlich Tests und gegebenenfalls Testdokumentation, nicht der Report-Contract:

- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/reports.auftragsliste.printPreview.integration.test.ts`, falls ein Druckvorschau-Endpunkt existiert
- `tests/integration/server/reportConfigs.reportEffects.integration.test.ts`
- Tourenplan-Integrationstests für `includeWithoutTour`
- `tests/unit/settings/useSettings.auftragsliste.test.ts`
- `docs/TEST_MATRIX.md`, falls die Matrix nicht mehr zum realen Testbestand passt

Produktionscode soll nur dann berührt werden, wenn die vorgeschaltete Analyse einen echten noch bestehenden Implementierungsfehler nachweist. Der Route-Contract der Reports bleibt unverändert.

## Rollen- und Sicherheitsbezug

Reports dürfen nach FT-26 von Admin, Disponent und Leser geöffnet und gelesen werden. Presets haben differenzierte Rechte: USER-Presets sind benutzerbezogen, GLOBAL-Presets sind für alle lesbar, aber nur Admins dürfen sie schreiben oder löschen.

Die späteren Tests müssen deshalb nicht nur Dateninhalt prüfen, sondern bei Druckvorschau und Presets auch die zulässigen Rollen sauber abdecken. Reine UI-Sichtbarkeit wäre kein ausreichender Nachweis; relevante Report- und Preset-Endpunkte müssen serverseitig geprüft werden.

## Auswirkungen eines Eingriffs

Variante A verbessert die Regressionserkennung für FT-26, ohne die Report-Verträge oder Datenmodelle zu ändern. Besonders wertvoll sind Tests, die echte Endpunkte, echte Fixture-Daten und bestehende Preset-Effekte verwenden.

Bereits gelöste Punkte zu Sauna-Modell-Filter und Tags sollen dabei nicht erneut umgebaut werden. Sie können höchstens als bestehende Abdeckung erhalten oder bei der Analyse als erledigt bestätigt werden.

## Schadenspotential

Niedrig bis mittel. Reine Testergänzungen haben begrenztes technisches Risiko, können aber instabil werden, wenn sie Druckvorschau, Rollenmatrix, dynamische KW-Auflösung oder echte Report-Fixtures zu breit koppeln.

Das Risiko wird begrenzt, indem zuerst der tatsächliche Endpunkt- und Testbestand geprüft wird und neue Tests den bestehenden FT-26-Integrationsmustern folgen.

## Vorgeschlagene Maßnahme

Variante A bevorzugen. Vor einer späteren Umsetzung den aktuellen Stand verifizieren und die erledigten Punkte `availableSaunaModels`, Sauna-Modell-Filter und Tags bewusst ausklammern.

Danach priorisiert:

1. Druckvorschau-Endpunkt der Auftragsliste prüfen und gegebenenfalls Integrationstest für Ausgabe ohne Paging und Rollenmatrix ergänzen.
2. `OPEN_PRINT_PREVIEW` für Auftragslisten-Presets nur bei vorhandenem Endpunkt end-to-end absichern.
3. `includeWithoutTour` beim Tourenplan über den tatsächlich auswertenden Report-Endpunkt testen.
4. Fehlende `useSettings.auftragsliste.test.ts` gegen die vorhandenen Resolver-Muster ergänzen oder die Testmatrix korrigieren, falls der Eintrag veraltet ist.

## Quelle

- Auftragsdatei vom 05.05.26: `C:\Users\r.rose\Downloads\codex-auftrag-ft26-reports-testabdeckung.md`
- Nutzerhinweis vom 05.05.26: Sauna-Modell-Filter und Tags sind bereits gelöst.
