# Auftragslog: Tab-Titel Standalone-Views

## Zweck

Die per `In neuem Tab öffnen` gestarteten Standalone-Ansichten und Reports sollten im Browser nicht nur die generische App-Bezeichnung, sondern den fachlichen Namen der geöffneten Sicht im Tab anzeigen.

## Scope

- Standalone-Layout setzt den Browser-Tab-Titel zentral anhand des bereits vorhandenen Seiten-Titels.
- Standalone-Reports verwenden nicht mehr pauschal `Reports`, sondern leiten den Titel aus dem geöffneten Reporttyp ab.
- Betroffen sind damit die im neuen Tab geöffneten Sichten wie `Projekte`, `Kunden`, `Termine`, `Mitarbeiter`, `Teams`, `Touren`, `Wochenübersicht`, `Monatsübersicht` sowie die Standalone-Reports.

## Technische Entscheidungen

- Die Titelsetzung erfolgt zentral in `StandaloneLayout` über `document.title`, damit alle bestehenden Standalone-Seiten ohne doppelte Logik denselben Mechanismus verwenden.
- Für Reports wurde bewusst nur eine kleine Zuordnung von `reportType` zu sichtbaren Fachbezeichnungen ergänzt, statt die Öffnungslogik mit `window.open` anzupassen.
- Die Öffnen-im-Tab-Mechanik, Routen, Query-Parameter und Report-Filterlogik bleiben unverändert.

## Betroffene Dateien

- `client/src/components/StandaloneLayout.tsx`
- `client/src/pages/StandaloneDomainViews.tsx`

## Hinweise zum Testen

- Relevanter manueller Check: jede per `In neuem Tab öffnen` gestartete Standalone-Sicht sollte einen Browser-Tab im Format `MuG Plan | <Sicht>` anzeigen.
- Für Reports sollte je nach Standalone-URL mindestens `MuG Plan | Vorlaufliste`, `MuG Plan | Produktionsplanung` oder `MuG Plan | Auftragsliste` erscheinen.

## Bekannte Einschränkungen

- In dieser Session wurde kein Audit und kein Testlauf ausgeführt.
- Falls künftig weitere Standalone-Reporttypen dazukommen, muss die Titelzuordnung in `StandaloneDomainViews.tsx` ergänzt werden.
