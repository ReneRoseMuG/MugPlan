# FT (05): Mitarbeiterverwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature dient der zentralen Verwaltung von Mitarbeitern als ausführende Ressourcen für Termine. Ziel ist es, Mitarbeiter als Stammdaten zu pflegen und ihre Einsätze über Termine hinweg nachvollziehbar darzustellen, ohne Terminplanung und Ressourcendarstellung fachlich zu vermischen. Dazu gehören neben der Stammdatenpflege auch mitarbeiterbezogene Lese- und Spezialansichten im Formular.

## Fachliche Beschreibung

Die Mitarbeiterverwaltung stellt Funktionen zum Anlegen, Bearbeiten und Anzeigen von Mitarbeitern bereit. Mitarbeiter können unabhängig von Terminen existieren und werden im Rahmen der Terminvergabe optional Terminen zugewiesen. Die Zuweisung selbst erfolgt nicht innerhalb dieses Features, sondern im Kontext der Terminplanung.

Disponenten erhalten serverseitig nur aktive Mitarbeiter und können Mitarbeiter damit nur aus dem aktiven Bestand auswählen. Die Verwaltung von aktiven und inaktiven Mitarbeitern (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation.

Das physische Löschen von Mitarbeitern ist eine Admin-Funktion. Dispatcher bzw. Disponenten und Leser werden serverseitig blockiert. Eine Löschung ist nur zulässig, wenn keine Terminreferenzen mehr bestehen.

Für jeden Mitarbeiter ist eine Terminübersicht verfügbar. Diese Übersicht zeigt alle Termine, denen der Mitarbeiter aktuell oder in der Vergangenheit zugewiesen war, und bildet damit die Einsatzhistorie des Mitarbeiters ab. Die Terminliste wird ausschließlich aus der Relation zwischen Termin und Mitarbeiter abgeleitet und ist jederzeit vollständig einsehbar. Änderungen an zukünftigen Terminen wirken sich unmittelbar auf die Terminliste eines Mitarbeiters aus. Vergangene Termine sind read-only und dürfen nicht nachträglich verändert werden, um die Stabilität der Einsatzhistorie sicherzustellen.

Im Mitarbeiterformular existiert zusätzlich ein dedizierter Tab **Abwesenheiten**. Darüber werden Abwesenheiten als spezialisierter Terminworkflow aus [FT (33)](../ft-33-abwesenheiten-ueber-interne-personalplanung/ft-33-abwesenheiten-ueber-interne-personalplanung.md) angelegt, bearbeitet und gelöscht. Der Mitarbeiterbereich ist damit der einzige reguläre Mutationspfad für Abwesenheiten.

Ebenfalls im Mitarbeiterformular existiert eine rein lesende **Umsatzübersicht**. Sie aggregiert qualifizierte Mitarbeitertermine serverseitig auf Wochenebene, unterstützt einen KW-Filter und zeigt zu Wochenzeilen eine Hover-Preview. Die Übersicht ist ausdrücklich lesend; es gibt daraus keine Export-, Schreib- oder Folgeaktionen.

In der Mitarbeiterdetailansicht können dem Mitarbeiter Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## Regeln & Randbedingungen

- Mitarbeiter können unabhängig von Terminen existieren.
- Die Zuweisung eines Mitarbeiters zu einem Termin ist optional.
- Ein Mitarbeiter kann einem oder mehreren Terminen zugewiesen sein.
- Disponenten erhalten serverseitig nur aktive Mitarbeiter zur Auswahl.
- Mitarbeiter dürfen nur durch Administratoren gelöscht werden und nur dann, wenn keine Terminreferenzen bestehen.
- Die Terminliste eines Mitarbeiters wird ausschließlich aus den aktuellen Termindaten abgeleitet.
- Vergangene Termine sind read-only und dürfen nicht verändert werden.
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf dieser Termin nicht mehr in der Terminliste des abgelösten Mitarbeiters erscheinen.
- Es dürfen keine widersprüchlichen Zustände entstehen, bei denen ein Mitarbeiter als zugewiesen gilt, ohne dass ein entsprechender Termin existiert.
- Mitarbeiter existieren unabhängig von Tour-Zugehörigkeit und Team-Zugehörigkeit. Löschungen von Tour oder Team wirken sich nur auf die FK-Eigenschaften des Mitarbeiters aus (Setzen auf NULL).
- Abwesenheiten eines Mitarbeiters werden ausschließlich über den dedizierten Mitarbeiter-Tab gepflegt und nicht über generische Terminmutationen.
- Die Umsatzübersicht ist rein lesend. Sie dient der Bewertung bereits geplanter oder historischer Umsätze eines Mitarbeiters und eröffnet keine Schreibpfade.
- Mitarbeiteranhänge sind mitarbeiterbezogen und unabhängig von Terminen; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## Use Cases

- [UC 05/01: Mitarbeiter anlegen](use-cases/uc-05-01-mitarbeiter-anlegen.md)
- [UC 05/02: Mitarbeiter bearbeiten](use-cases/uc-05-02-mitarbeiter-bearbeiten.md)
- [UC 05/03: Mitarbeiter-Termine anzeigen](use-cases/uc-05-03-mitarbeiter-termine-anzeigen.md)
- [UC 05/04: Mitarbeiter deaktivieren](use-cases/uc-05-04-mitarbeiter-deaktivieren.md)
- [UC 05/05: Mitarbeiter reaktivieren](use-cases/uc-05-05-mitarbeiter-reaktivieren.md)
- [UC 05/06: Mitarbeiteranhänge verwalten](use-cases/uc-05-06-mitarbeiteranhaenge-verwalten.md)
- [UC 05/07: Mitarbeiter anzeigen](use-cases/uc-05-07-mitarbeiter-anzeigen.md)
- [UC 05/08: Versionskonflikt bei paralleler Mitarbeiterbearbeitung](use-cases/uc-05-08-versionskonflikt-bei-paralleler-mitarbeiterbearbeitung.md)
- [UC 05/09: Konflikt bei paralleler Deaktivierung und Terminzuweisung](use-cases/uc-05-09-konflikt-bei-paralleler-deaktivierung-und-terminzuweisung.md)
- [UC 05/10: Löschversuch bei bestehenden Terminreferenzen](use-cases/uc-05-10-loeschversuch-bei-bestehenden-terminreferenzen.md)
- [UC 05/11: Konflikt bei paralleler Reaktivierung und Bearbeitung](use-cases/uc-05-11-konflikt-bei-paralleler-reaktivierung-und-bearbeitung.md)
- [UC 05/12: Rollenverletzung bei API-Direktzugriff](use-cases/uc-05-12-rollenverletzung-bei-api-direktzugriff.md)
- [UC 05/13: Query-Konsistenz zwischen Listen- und Dialogansicht](use-cases/uc-05-13-query-konsistenz-zwischen-listen-und-dialogansicht.md)
- [UC 05/14: Mitarbeiter aus CSV importieren](use-cases/uc-05-14-mitarbeiter-aus-csv-importieren.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte

Die später ergänzten Bereiche **Abwesenheiten** und **Umsatzübersicht** wurden redaktionell nachgezogen. Eigene zusätzliche Use-Case-Dateien für diese nachträglichen Erweiterungen sind im aktuellen Stand noch nicht separat ergänzt.
