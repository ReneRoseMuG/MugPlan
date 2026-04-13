# Auftragslog: Meine Einstellungen mit User-Scope

## Zweck

Der Einstellungsbereich sollte für Nicht-Admins benutzerspezifische Einstellungen zugänglich machen, ohne dabei Admin-Bereiche in der Navigation oder in der Oberfläche sichtbar zu machen.

## Scope

- Navigation um einen allgemeinen Einstieg `Meine Einstellungen` ergänzt
- `settings`-View im Frontend für alle eingeloggten Nutzer geöffnet
- `SettingsPage` für Nicht-Admins auf benutzerspezifische Bereiche begrenzt
- Parse-Bug im JSX nach dem UI-Umbau lokal behoben

## Technische Entscheidungen

- Kein Backend-Eingriff; serverseitige Berechtigungsregeln wurden bewusst nicht verändert
- Admin-Bereiche `Kalender`, `Sicherheit`, `Backup & Dump` bleiben in der `SettingsPage` ausschließlich für Admin sichtbar
- Globale Oberflächen-Settings bleiben nur für Admin sichtbar; Nicht-Admins sehen nur die bestehenden USER-Settings
- Der bestehende Admin-Block in der Sidebar behält `Stammdaten` und `Benutzerverwaltung`; `Einstellungen` wurde daraus herausgezogen

## Betroffene Dateien

- `client/src/components/Sidebar.tsx`
- `client/src/pages/Home.tsx`
- `client/src/components/SettingsPage.tsx`

## Hinweise zum Testen

- Als Nicht-Admin prüfen, dass in der Sidebar `Meine Einstellungen` sichtbar ist
- Als Nicht-Admin prüfen, dass nur benutzerspezifische Einstellungen sichtbar sind
- Als Admin prüfen, dass die vollständigen Einstellungsbereiche weiterhin sichtbar sind
- Routing in den View `settings` sowohl für Admin als auch Nicht-Admin prüfen

## Bekannte Einschränkungen

- Die serverseitige Absicherung für globale Settings wurde in diesem Auftrag ausdrücklich ausgeklammert
- Audit und Testlauf erfolgen getrennt nach dem Speichern des aktuellen Arbeitsstands
