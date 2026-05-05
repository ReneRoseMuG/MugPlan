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

### Stammdaten

Der Tab **Stammdaten** enthält die direkten Mitarbeiterdaten. Dazu gehören Identitäts- und Kontaktdaten, Tour- und Teambezüge sowie der Aktivstatus. In der Mitarbeiterdetailansicht können dem Mitarbeiter außerdem Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen; die übergreifenden Anhangsregeln liegen in [FT (19)](../ft-19-attachments/ft-19-attachments.md).

### Mitarbeiter Termine

Der Tab **Termine** zeigt die Einsatzhistorie des Mitarbeiters. Quelle ist ausschließlich die aktuelle Relation zwischen Termin und Mitarbeiter; es gibt keine separate Mitarbeiter-Termin-Historie in diesem Feature. Angezeigt werden Termine, denen der Mitarbeiter aktuell oder in der Vergangenheit zugewiesen war. Änderungen an zukünftigen Terminen wirken sich unmittelbar auf diese Liste aus. Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf der Termin nicht mehr in der Terminliste des abgelösten Mitarbeiters erscheinen. Die Terminanlage, Terminbearbeitung und Mitarbeiterzuweisung selbst gehören fachlich zu [FT (01)](../ft-01-kalendertermine/ft-01-kalendertermine.md).

### Abwesenheiten

Der Tab **Abwesenheiten** ist der dedizierte Mitarbeiterpfad für Abwesenheiten. Darüber werden Abwesenheiten als spezialisierter Terminworkflow aus [FT (33)](../ft-33-abwesenheiten-ueber-interne-personalplanung/ft-33-abwesenheiten-ueber-interne-personalplanung.md) angelegt, bearbeitet und gelöscht. Der Mitarbeiterbereich ist damit der einzige reguläre Mutationspfad für Abwesenheiten; außerhalb dieses Pfads bleiben Abwesenheiten lesbar, dürfen aber nicht über generische Terminaktionen verändert werden.

### Wochenplanung

Der Tab **Wochenplanung** zeigt Tour-Kalenderwochen, in denen der Mitarbeiter eingeplant ist. Quelle sind die Tour-KW-Mitarbeiterzuordnungen aus der Tourenplanung, nicht die Terminliste des Mitarbeiters. Der Tab dient der Einordnung, in welchen Tourwochen der Mitarbeiter als Ressource vorgesehen ist; fachliche Regeln, Sperren und Mutationen der Tour-KW-Planung liegen in [FT (04)](../ft-04-tourenplanung/ft-04-tourenplanung.md).

### Umsatzübersicht

Der Tab **Umsatz Übersicht** ist eine rein lesende Auswertung bereits vorhandener Mitarbeitertermine. Die Übersicht aggregiert die qualifizierten Termine serverseitig auf ISO-Wochenebene und zeigt pro Woche Anzahl der gewerteten Aufträge, Umsatzsumme und eine Hover-Preview der enthaltenen Termine. Der Kalenderwochenfilter im Tabellenfuß ist nur eine Oberflächenfunktion zur Eingrenzung der angezeigten Wochenzeilen; er ist keine fachliche Berechnungsregel und verändert die serverseitige Grundmenge nicht. Es gibt aus der Umsatzübersicht keine Export-, Schreib- oder Folgeaktionen.

In die Umsatzübersicht gehen nur Termine ein, die alle folgenden Bedingungen erfüllen:

- Der Termin ist dem betrachteten Mitarbeiter über die Termin-Mitarbeiter-Relation zugeordnet.
- Der Termin ist einem Projekt zugeordnet; reine Kundentermine ohne Projekt werden nicht gewertet.
- Zum Projekt existiert ein Auftrag mit einer nicht leeren, als Betrag lesbaren Auftragssumme.
- Der Termin trägt nicht den geschützten Systemzustand **Storniert**.
- Weder der Termin noch das zugeordnete Projekt tragen den geschützten Systemzustand **Reklamation**.

Stornierte und reklamierte Termine werden vor der Deduplizierung ausgeschlossen. Mehrere verbleibende Termine mit derselben Auftragsnummer werden für die Umsatzberechnung global dedupliziert. Gewertet wird dann nur der früheste qualifizierte Termin nach Datum, Startzeit und Termin-ID. Die Umsatzsumme einer Woche ist die Summe der Auftragssummen der nach diesen Regeln ausgewählten Termine. Die Storno-, Reklamations- und Systemtag-Regeln liegen in [FT (01)](../ft-01-kalendertermine/ft-01-kalendertermine.md), [FT (06)](../ft-06-automatische-regeln/ft-06-automatische-regeln.md) und [FT (28)](../ft-28-universelles-tagging-system/ft-28-universelles-tagging-system.md); Projekt- und Auftragsdaten gehören zu [FT (02)](../ft-02-projekte/ft-02-projekte.md).

### Auslastung

Der Tab **Auslastung** zeigt die Belegung eines einzelnen Mitarbeiters in einer read-only Kalenderansicht. Die Darstellung nutzt dieselbe fachliche Termingrundlage wie die Kalenderansichten und dient der schnellen Einschätzung der geplanten Auslastung. Aus dieser Ansicht heraus werden keine Termine erzeugt, verschoben oder bearbeitet. Die zugehörige Kalenderlogik ist in [FT (03)](../ft-03-kalenderansichten/ft-03-kalenderansichten.md) beschrieben.

### Journal

Der Tab **Journal** zeigt die Änderungshistorie des Mitarbeiterdatensatzes. Er ist eine lesende Nachvollziehbarkeitsfunktion und ersetzt keine fachliche Validierung beim Speichern. Die übergreifenden Regeln für Journal-Einträge, Kontextbezüge und Leserechte sind in [FT (08)](../ft-08-journal-aenderungshistorie/ft-08-journal-aenderungshistorie.md) dokumentiert.

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

Die im Mitarbeiterformular eingebundenen Querschnittsbereiche verweisen auf ihre fachlichen Hauptfeatures. Eigene zusätzliche FT-05-Use-Case-Dateien für Umsatzübersicht, Wochenplanung, Auslastung und Journal sind im aktuellen Stand nicht separat ergänzt.
