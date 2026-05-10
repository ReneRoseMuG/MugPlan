# 10.05.26 | Implementierung | Projekt-Speichern-Dialog und Reportkarten-Nacharbeit

## Zusammenfassung

Der offene Arbeitsstand bündelt zwei Nacharbeiten: Im Projektformular wurde der Speichern-Flow für Projekte mit Dokumentextraktion, Artikelliste, Sauna-Modell-Vorschlag, Reklamationsnotiz und PDF-Duplikatentscheidung in einen gemeinsamen Review-Dialog überführt. Dadurch ersetzen gezielte Dialogschritte mehrere verstreute Browser-Confirm- und Einzelpfade.

Für Reports wurde die Nacharbeit an Auftragsliste und Tourenplan fortgeführt. Die Auftragsliste rendert in Reportansicht und Druckvorschau wieder dieselbe Kartenkomponente. Die Druckmessung bleibt erhalten, misst aber nun die echte Reportkarte statt einer separaten Druckkarte. Die Reportkarte schneidet farbige Header- und Footerbereiche sauber an den Rundungen ab; der zusätzliche rechteckige Header-Border wurde entfernt.

Zusätzlich wurde die Artikellisten-Darstellung in Auftragsliste und Tourenplan an den bestehenden Artikellisten-Renderer angebunden, damit Headline, vollständige Artikelliste, Shortcodes und Sortierung konsistent bleiben. Die Auftragslisten-Kategorieauswahl ist dadurch entfallen.

## Konkrete Änderungen

- Projektformular: `ProjectSaveReviewDialog` ergänzt und in `ProjectForm` eingebunden.
- Projektformular: Entscheidung zur Sauna-Titelübernahme, Reklamationsnotiz und PDF-Duplikat werden im Speichern-Review gebündelt.
- Projektformular: Dokumentextraktions-PDF bleibt im Draft sichtbar und kann aus dem Formular heraus in einem neuen Tab geöffnet werden.
- Reports: Preset-UI aus den Report-Konfigurationscontainern entfernt.
- Reports: Aktualisieren-Aktionen aus Reportansichten und Druckvorschauen entfernt.
- Auftragsliste: Druckkarte nutzt dieselbe `AuftragslisteProjectCard` wie die Reportansicht.
- Auftragsliste und Tourenplan: Artikellisten werden über den gemeinsamen Renderer mit vollständiger Liste und Shortcode-Unterstützung gerendert.
- Tourenplan: Tag-Spalte und Karten-Spaltenbreiten wurden für verkürzte Tag-Darstellung, Terminspalte und harmonischere Artikel-/Anmerkungsbereiche angepasst.
- Wiki: Aufgabe A-21 wurde in Bearbeitung gesetzt und fachlich konkretisiert.

## Verifikation

- `npm test -- --run tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/lib/auftragsliste-print-model.test.ts` erfolgreich mit 9 Tests in 3 Dateien.
- `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts --grep "filters the Auftragsliste|resolves competing|paginiert lange|renders the Tourenplan"` erfolgreich mit 4 Browser-E2E-Tests.
- Gesammelte Report-Unit- und Integrationstests erfolgreich mit 176 Tests in 41 Dateien.
- Report-Browser-E2E-Suite erfolgreich mit 12 Tests.
- `npm run check` erfolgreich.

## Rollen

- Projektmutationen bleiben für schreibberechtigte Rollen vorgesehen: im Client `ADMIN` und `DISPATCHER`, serverseitig gemäß bestehender Durchsetzung `ADMIN` und `DISPONENT`.
- `READER` beziehungsweise `LESER` bleibt lesend; es wurde keine neue Schreibaktion und kein neuer Endpunkt eingeführt.
- Reports bleiben für `ADMIN`, `DISPONENT` und `LESER` gemäß bestehender Serverlogik sichtbar und ausführbar.
- Die Änderungen an Reportkarten und Druckvorschauen verändern keine serverseitigen Berechtigungen.

## Offene Punkte

- Die Projekt-Speichern-Review-Änderung ist UI-seitig vorbereitet und getestet. Server-Contracts, Persistenz und Rollenlogik wurden bewusst nicht geändert.
- Die Report-Druckkarten sind wieder an die Reportkarten gekoppelt; künftige Layoutänderungen an der Auftragslistenkarte wirken damit automatisch auch auf die Druckvorschau.

