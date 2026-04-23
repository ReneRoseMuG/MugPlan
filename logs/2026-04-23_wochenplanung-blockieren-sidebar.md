# Auftragslog: Wochenplanung Blockieren in Sidebar verschieben

## Zweck

Der Button zum Blockieren der Wochenplanung sollte aus dem Footer des Formulars `Tour -> Wochenplanung -> Formular Wochenplanung` entfernt und stattdessen in ein neues Sidebar-Panel `Funktionen` an oberster Stelle verschoben werden. Die bestehende Blockieren-/Freigeben-Funktionalität sollte unverändert erhalten bleiben.

## Scope

- Lokales UI-Refactoring im Wochenplanungsformular
- Übernahme des bestehenden Panels `Funktionen` als Muster aus dem Tour-Formular
- Anpassung der direkt betroffenen Tests
- Keine Änderung an Serverlogik, Rollenlogik oder API-Verträgen

## Technische Entscheidungen

- Die bestehende Aktion wurde nicht neu implementiert, sondern mit denselben Callback-Props `onBlockWeek` und `onUnblockWeek` in die Sidebar verschoben.
- Die vorhandenen Disabled-Regeln bleiben erhalten: gesperrte oder laufend mutierende Wochen können weiterhin nicht blockiert oder freigegeben werden.
- Die vorhandenen Test-IDs `button-block-tour-week` und `button-unblock-tour-week` bleiben bestehen, damit die bestehende Verhaltensverdrahtung stabil bleibt.
- Das neue Sidebar-Panel wurde nur im `tour`-Scope sichtbar gemacht, analog zur bisherigen Sichtbarkeit der Aktion.

## Betroffene Dateien

- `client/src/components/TourWeekForm.tsx`
- `tests/unit/ui/tourWeekForm.render.test.tsx`

## Hinweise zum Testen

- Erfolgreich ausgeführt: `npx vitest run tests/unit/ui/tourWeekForm.render.test.tsx`
- Der Render-Test prüft jetzt zusätzlich, dass das neue Panel `Funktionen` vorhanden ist und vor der Notiz-Sidebar erscheint.

## Bekannte Einschränkungen

- Es wurde bewusst kein vollständiger Browser- oder Integrations-Testlauf gestartet, weil der Auftrag ein kleiner lokaler Fix war und nur die direkt betroffene Testabdeckung angepasst werden sollte.
- Die serverseitige Berechtigungsdurchsetzung wurde nicht verändert; dieses Refactoring verschiebt nur die bestehende UI-Aktion.
