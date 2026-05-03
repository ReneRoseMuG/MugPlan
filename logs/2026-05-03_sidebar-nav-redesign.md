# Ergebnisdokumentation: Sidebar-Navigation

## Zweck

Diese Dokumentation beschreibt das UI-Redesign der linken Navigationsleiste vom 03.05.26.

## Auftrag

Die Navigation sollte sich am bereitgestellten Designvorschlag orientieren. Die bisherigen Gruppencontainer mit farbigen Balken sollten aufgelöst werden. Beschriftungen sollten gekürzt werden, ohne neue Icons einzuführen. Außerdem sollte der Kopfbereich „MuG Plan“ die bestehende Neu-Laden-Funktion übernehmen.

## Umsetzung

- `client/src/components/Sidebar.tsx`
  - Die Navigationsgruppen wurden von gerahmten Containern auf einfache Abschnittsüberschriften mit Trennlinien umgestellt.
  - Die Labels wurden gekürzt, unter anderem „Wochenübersicht“ zu „Woche“, „Monatsübersicht“ zu „Monat“, „Termine“ zu „Tabelle“, „Tour PLZ Planung“ zu „PLZ Planung“ und „Meine Einstellungen“ zu „Einstellungen“.
  - Die bestehenden Icons wurden beibehalten; es wurden keine neuen Icons eingeführt.
  - Die Sidebar-Breite orientiert sich nun stärker am Inhalt statt an einer festen breiten Mindestgröße.
  - Der frühere separate Button „Neu Laden“ wurde entfernt. Die komplette Kopfzeile mit „MuG Plan“ ist nun die Reload-Aktionsfläche.
  - Das vorhandene Reload-Icon steht links neben „MuG Plan“ und übernimmt den Farbzustand für verfügbare Änderungen auf der gesamten Kopfzeile.

## Rollen- und Rechteprüfung

Es wurden keine Rollen-, Sichtbarkeits- oder Berechtigungsregeln verändert. Bestehende Rollenprüfungen für Reports, Monitoring, Journal, Tour PLZ Planung und Administration bleiben an den bestehenden Bedingungen. Die Änderung betrifft ausschließlich Darstellung und Bedienfläche der vorhandenen Navigation.

## Prüfung

Ausgeführt:

- `npm run typecheck` - erfolgreich.
- `npx eslint client/src/components/Sidebar.tsx` - erfolgreich.

## Bekannte Einschränkungen

Es wurde kein Browser-E2E-Lauf ausgeführt. Die bestehenden Test-IDs der Navigation und der Reload-Aktion wurden bewusst erhalten, damit vorhandene Browser-Tests weiter dieselben Einstiegspunkte verwenden.
