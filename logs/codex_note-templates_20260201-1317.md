#### Ziel
Die Notizerstellung soll Vorlagen mit Titel, Body und optionaler Farbe übernehmen, die UI soll Vorlagen wählbar machen, Farben anzeigen und keine Löschfunktion mehr anbieten. Außerdem soll die Notizvorlagen-Verwaltung den Color-Selector-Dialog nutzen und zusätzliche Felder für Sortierung/Aktivstatus anbieten.

#### Ausgangslage und Fundstellen
Ausgangspunkt waren die Notiz- und Vorlagenrouten im Shared-Schema sowie die Services für Kunden- und Projektnotizen, die bereits Vorlagenlogik für Kunden enthielten. Auf der UI-Seite waren NotesSection, CustomerData, ProjectForm und NoteTemplatesPage die relevanten Stellen für Dialoge, Mutations und Darstellung.

#### Durchgeführte Änderungen
Ich habe die Notiz- und Vorlagen-Schemata um eine optionale Farbe ergänzt und die Projekt-Notiz-API um templateId erweitert. Die Services für Kunden- und Projektnotizen übernehmen nun Titel, Body und Farbe serverseitig aus der Vorlage. In der UI lädt der Neue-Notiz-Dialog aktive Vorlagen, füllt Titel und Body bei Auswahl vor, sendet templateId und zeigt die Farbmarkierung an; der Delete-Button wurde entfernt. Die Notizvorlagen-Verwaltung nutzt jetzt ColorSelectEntityEditDialog, erlaubt Sortierreihenfolge und zeigt Farbmarkierungen auf den Karten, wobei die Farbauswahl für Nicht-Admins deaktiviert ist.

#### Tests und Nachweise
Es wurden keine Tests ausgeführt (nicht angefordert).

#### Refactoring-Bedarf (nicht umgesetzt)
Kein zusätzlicher Refactoring-Bedarf identifiziert.

#### Offene Punkte und Blocker
Eine echte Admin-Erkennung für die Freischaltung der Farbauswahl fehlt im UI; die Farbauswahl ist deshalb aktuell deaktiviert und sollte bei verfügbarer Rollenlogik aktiviert werden.
