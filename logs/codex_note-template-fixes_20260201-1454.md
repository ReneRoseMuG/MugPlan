#### Ziel
Die Notizvorlagen-Logik soll Nutzeränderungen an Titel/Inhalt beim Erstellen nicht überschreiben, die Vorlagenfarbe einmalig übernehmen und die Bearbeitung der Vorlagenfarbe für Administratoren praktikabel machen. Zusätzlich sollen DB-Schema und Migration für die Farbspalten konsistent und lokal anwendbar sein.

#### Ausgangslage und Fundstellen
Die Notizerstellung läuft über die Services in `server/services/customerNotesService.ts` und `server/services/projectNotesService.ts`, die bei gesetztem `templateId` aktuell den kompletten Inhalt überschreiben. Die UI für Vorlagen liegt in `client/src/components/NoteTemplatesPage.tsx`, wo die Farbbearbeitung deaktiviert war. Das Referenzschema in `docs/MuGPlan_PostgreSQL_Schema.sql` fehlte um die `color`-Spalten.

#### Durchgeführte Änderungen
Ich habe die Notiz-Create-Logik so angepasst, dass `templateId` nur die Vorlagenfarbe übernimmt und Titel/Inhalt aus dem Request bleiben. Zusätzlich wird bei fehlender Vorlage ein klarer Fehler ausgelöst. Im Frontend ist die Farbauswahl für Admins wieder nutzbar, aktuell über ein temporäres LocalStorage-Flag (Dokumentation/TODO im Code). Die Referenz-SQL-Datei wurde um die `color`-Spalten erweitert und eine SQL-Migration für MySQL hinzugefügt.

#### Tests und Nachweise
Es wurden keine Tests ausgeführt (kein passendes Kommando im Auftrag ausgeführt).

#### Refactoring-Bedarf (nicht umgesetzt)
Kein Refactoring-Bedarf festgestellt, der über die Aufgabenstellung hinausgeht.

#### Offene Punkte und Blocker
Es existiert im Frontend/Backend derzeit kein echtes Rollen- oder Permissionsignal. Die Admin-Prüfung für die Vorlagenfarbe ist deshalb temporär über `localStorage` gelöst und muss später an echte Rollen gebunden werden.
