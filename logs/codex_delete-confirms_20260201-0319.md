#### Ziel
Die Löschaktionen für Hilfetexte, Notizvorlagen, Teams und Touren sollten mit Bestätigungsdialogen abgesichert werden, wobei der jeweilige Titel im Dialogtext erscheint. Zusätzlich sollten die Karten für Hilfetexte und Notizvorlagen den EntityCard-Standard einhalten und Doppelklicks auf Team- und Tour-Karten den Edit-Dialog öffnen.

#### Ausgangslage und Fundstellen
Die Hilfetext-, Notizvorlagen-, Team- und Tour-Listen samt Delete-Logik liegen in den Komponenten `HelpTextsPage`, `NoteTemplatesPage`, `TeamManagement` und `TourManagement`. Dort wurden die EntityCard/ColoredEntityCard-Komponenten sowie die Delete-Handler identifiziert, die für die Anpassungen geeignet sind.

#### Durchgeführte Änderungen
In den genannten Komponenten wurden Bestätigungsdialoge mit titelspezifischem Text vor den Delete-Mutationen ergänzt. Die Hilfetext-Karte zeigt jetzt den Titel im Header, die Notizvorlagen-Karte nutzt die EntityCard-Struktur mit Header-X-Button und Footer-Edit-Button. Team- und Tour-Karten öffnen per Doppelklick denselben Edit-Handler wie der Edit-Button.

#### Tests und Nachweise
Es wurden keine automatisierten Tests ausgeführt.

#### Refactoring-Bedarf (nicht umgesetzt)
Kein zusätzlicher Refactoring-Bedarf erkannt.

#### Offene Punkte und Blocker
Keine offenen Punkte.
