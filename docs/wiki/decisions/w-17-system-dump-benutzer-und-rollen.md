# W-17 - System-Dump: Benutzer und Rollen übertragen

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: System-Dump, Admin-Transfer und Auth-Daten
- Entdeckt: 04.05.26
- Art: Architektur-Refaktoring

## Befund

Die System-Dump-Funktion überträgt die Tabelle `users` aktuell nicht. Das ist kein technischer Exportfehler, sondern Teil des bestehenden Dump-Vertrags: `users` und `roles` sind ausdrücklich vom Dump-Tabellensatz ausgeschlossen. Beim Import werden unbekannte Tabellen wie `users` derzeit ignoriert.

Für einen vollständigen Systemtransfer ist dieses Verhalten fachlich unvollständig, weil Benutzerkonten, Rollenbezug, Aktivstatus, 2FA-Status und Passwort-Hash nicht mitwandern. Das Passwortfeld liegt nicht als Klartext vor, sondern als `password_hash` beziehungsweise im Code als `passwordHash`. Für die spätere Beauftragung gilt: Wenn Benutzer übertragen werden, müssen alle Felder der Benutzertabelle übertragen werden, einschließlich Passwort-Hash und 2FA-Feldern.

## Optionen

- A) Aktuellen Zustand beibehalten: Fachdaten werden übertragen, Benutzer und Rollen bleiben bewusst außerhalb des Dumps.
- B) `users` und `roles` vollständig in den Dump-Vertrag aufnehmen und Export, Manifest, Preview, Import, Verifikation und Tests entsprechend erweitern.
- C) Nur Benutzer ohne sensible Auth-Felder übertragen und Passwörter nach dem Import neu setzen.

## Auswirkungen eines Eingriffs

Variante B macht den System-Dump zu einem echten Volltransfer einschließlich Auth-Basis. Betroffen wären mindestens der zentrale Dump-Tabellensatz, das Dump-Manifest, die Import-Reihenfolge, die Tabellenverifikation, Legacy-Toleranz, Integrationstests und die Sicherheitsdokumentation des Admin-Transfers. Da `users.role_id` auf `roles.id` verweist, müssen Rollen entweder gemeinsam übertragen oder beim Import eindeutig gemappt werden. Ein bloßes Hinzufügen von `users` ohne saubere Behandlung von `roles` wäre fachlich und technisch riskant.

Bestehende Fachdaten-Roundtrips sollen unverändert bleiben. Der Import darf keine Rollen- oder Lock-Regeln umgehen und muss auch bei direkten API-Aufrufen weiter ausschließlich serverseitig abgesichert sein.

## Rollen- und Sicherheitsbezug

Der betroffene Vorgang ist ein sensibler Admin-Transfer. Sichtbarkeit und Ausführung sind ausschließlich für `ADMIN` zulässig. Die Beschränkung wird heute serverseitig im Dump-Service über den Admin-Kontext und zusätzlich über die Admin-Maintenance-Policy für sensible beziehungsweise destruktive Admin-Endpunkte durchgesetzt.

Durch die Aufnahme von Passwort-Hashes, 2FA-Feldern und Rollenbezügen steigt die Sensibilität von Dump-Erstellung, Download, Import-Preview, Import-Apply und gespeicherten Dump-Dateien. Reine UI-Sichtbarkeit reicht hier nicht aus; der spätere Eingriff muss serverseitige Zugriffskontrolle, Dateizugriff, Import-Sicherheitsphrase, Produktionszielprüfung und Testabdeckung für unzulässige Rollen ausdrücklich prüfen.

## Schadenspotential

Hoch. Ein fehlerhafter Import könnte Administratorzugänge löschen, falsche Rollen zuweisen, Benutzer deaktivieren, Passwort-Hashes überschreiben, 2FA-Zustände beschädigen oder einen Login nach dem Transfer verhindern. Zusätzlich enthalten Dumps danach sensible Auth-Daten. Das Risiko ist beherrschbar, wenn `roles` und `users` als gemeinsamer Transferbereich behandelt werden, die Import-Reihenfolge klar ist, bestehende Admin-Schutzmechanismen erhalten bleiben und Tests sowohl erfolgreichen Volltransfer als auch Ablehnung unzulässiger Rollen abdecken.

## Vorgeschlagene Maßnahme

Variante B als bevorzugten Refactoring-Pfad vorbereiten. Vor der Umsetzung den bestehenden Dump-Vertrag gezielt erweitern, `roles` vor `users` exportieren und importieren, Manifest und Verifikation um beide Tabellen ergänzen und Legacy-Dumps weiterhin kontrolliert behandeln. Die Tests, die `users` und `roles` aktuell als ausgeschlossen erwarten, müssen bewusst auf den neuen Volltransfer-Vertrag umgestellt werden. Zusätzlich braucht es mindestens einen Roundtrip-Test, der `passwordHash`, Rollenbezug, Aktivstatus und 2FA-Felder nach dem Import verifiziert.

## Quelle

- Lokale Codeanalyse vom 04.05.26: `server/services/dumpService.ts`, `shared/schema.ts`, `tests/unit/services/dumpService.test.ts`, `tests/integration/server/admin.dump.integration.test.ts`
