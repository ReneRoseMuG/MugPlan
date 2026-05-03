# Ergebnisdokumentation: Standalone-Layout und Header

## Zweck

Diese Dokumentation beschreibt die Layout-Korrektur für Ansichten, die über „In neuem Tab öffnen“ als Standalone-Route geöffnet werden.

## Auftrag

Die Standalone-Views sollten das zuvor in der Hauptansicht entfernte äußere Card-Layout ebenfalls nicht mehr zeigen. Zusätzlich sollten Nicht-Kalender-Views ihre Kopfbereichsfarbe an die Navigationsleiste angleichen. Kalender wurden auf Nutzerwunsch ausdrücklich von der Kopfbereich-Farbangleichung ausgenommen. Nach einem sichtbaren Doppel-Header in Standalone-Listen sollte nur der obere Standalone-Header mit „MuG Plan“ erhalten bleiben.

## Umsetzung

- `client/src/components/StandaloneLayout.tsx`
  - Die äußere Standalone-Fläche rendert ohne Padding, Rundung, Rahmen oder Schatten um die direkte View-Wurzel.
  - Der Standalone-Header unterstützt eine Standard- und eine Navigations-Farbvariante.
  - Standalone-Inhalt wird per Kontext markiert, damit untergeordnete Layouts Doppel-Header vermeiden können.
- `client/src/components/ui/list-layout.tsx`
  - Listenansichten blenden ihre eigene Titelzeile im Standalone-Kontext aus.
  - Kopf-, Filter- und Footerbereiche gemeinsamer Listenlayouts verwenden außerhalb der Kalender den Navigationston.
- Kalenderansichten
  - Wochen- und Monatskalender behalten ihre bisherigen Headerfarben.
  - Die äußeren Kalender-Root-Cards wurden geglättet, damit Standalone-Kalender nicht mehr das alte gerahmte Layout zeigen.

## Rollen- und Rechteprüfung

Keine Rollen-, Sichtbarkeits- oder Berechtigungslogik wurde geändert. Die Änderung betrifft ausschließlich Layout- und Darstellungslogik in bestehenden UI-Komponenten. Bestehende Reader-, Dispatcher- und Admin-Rechte bleiben unverändert.

## Prüfung

Ausgeführt:

- `npm run test:unit -- tests/unit/ui/layoutSurfaces.test.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarMonthSheetView.wiring.test.tsx` - erfolgreich.
- `npm run typecheck` - erfolgreich.
- Live-DOM-Check auf `/standalone/projects`: Standalone-Header vorhanden, innerer Listen-Header nicht mehr gerendert.

## Ergebnis

Standalone-Routen nutzen nun die verfügbare Fläche ohne zusätzliche äußere Card. Nicht-Kalender-Views haben den gewünschten Navigationston im Kopfbereich, während Kalender-Header farblich unverändert bleiben. Doppel-Header in Standalone-Listen sind entfernt.
