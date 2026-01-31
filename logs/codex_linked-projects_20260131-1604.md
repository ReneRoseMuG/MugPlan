#### Ziel
Die Demoansicht „Verknüpfte Projekte“ im Kundenformular sollte durch eine echte, read-only Projektliste ersetzt werden, die Projekte per customer_id lädt und per Doppelklick das bestehende Projektformular öffnet.

#### Ausgangslage und Fundstellen
Ich habe die Demo-Projektliste im Kundenformular in `client/src/components/CustomerData.tsx` gefunden und dort den passenden UI-Einstieg identifiziert. Für den Datenabruf existierte nur die allgemeine Projektroute ohne customer_id-Filter in `server/controllers/projectsController.ts` und `server/repositories/projectsRepository.ts`, wodurch eine spezifische Kundenabfrage ergänzt werden musste.

#### Durchgeführte Änderungen
Ich habe im Backend eine Projektsuche nach customer_id ergänzt und die Controllerlogik um eine optionale customerId-Query erweitert. Im Frontend habe ich eine wiederverwendbare Sub-Panel-Komponente für „Verknüpfte Projekte“ sowie eine eigenständige Projekt-Card-Komponente erstellt, die Status-Flaggen als vertikalen Stapel anzeigt und per Doppelklick das bestehende Projektformular öffnet.

#### Tests und Nachweise
Es wurden keine automatisierten Tests ausgeführt (nicht angefragt).

#### Refactoring-Bedarf (nicht umgesetzt)
Kein zusätzlicher Refactoring-Bedarf festgestellt.

#### Offene Punkte und Blocker
Keine.
