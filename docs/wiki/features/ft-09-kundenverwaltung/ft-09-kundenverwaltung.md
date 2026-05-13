# FT (09): Kundenverwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature stellt die Verwaltung von Kundenstammdaten bereit, damit Termine nicht mehr mit frei erfassten Kundendaten arbeiten müssen. Termine referenzieren künftig ein Projekt und über dieses einen Kunden und übernehmen Adresse sowie Kontaktdaten daraus, um Konsistenz, Wiederverwendbarkeit und saubere Historien sicherzustellen. Einem Kunden können Notizen zugeordnet werden.

## Fachliche Beschreibung

Die Kundenverwaltung ermöglicht das Anlegen, Bearbeiten und Anzeigen von Kunden. Pro Kunde werden Stammdaten gespeichert, insbesondere **Name/Firma**, **Kundennummer**, **Adresse** und **Telefonnummer**.

Kundendaten können auch aus der Dokumentextraktion übernommen werden. Dabei gilt die Kundennummer als primärer Schlüssel zur Auflösung. Wird ein bestehender Kunde gefunden, wird er verknüpft beziehungsweise ins Formular geladen. Enthält das Dokument Stammdaten, die im bestehenden Kundensatz noch leer sind, dürfen ausschließlich diese leeren Felder nach sichtbarer Nutzerentscheidung ergänzt werden. Vorhandene Kundendaten werden nicht still überschrieben.

Ein Kunde kann beliebig viele Projekte und damit indirekt beliebig viele Termine besitzen. In der Kundendetailansicht wird eine **Projektliste** angezeigt, die alle dem Kunden zugeordneten Projekte umfasst (z. B. Aufbau, Service, Nachbesserung).

Disponenten erhalten serverseitig nur aktive Kunden und können daher nur aktive Kunden für neue Projekte auswählen. Die Verwaltung von aktiven und inaktiven Kunden (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation für Disponenten.

Kunden haben eine **Notizenliste** (0..n). Notizen sind freie Texteinträge, die kundenbezogene Informationen, Absprachen oder Besonderheiten dokumentieren. Jede Notiz besteht aus einem Titel und einem Inhalt. Notizen sind **kundenbezogen** und **projektunabhängig** – sie gelten für alle zum Kunden gehörenden Projekte und Termine und bleiben bestehen, unabhängig von Projektänderungen, Kundenstatusänderungen oder anderen Modifikationen. Notizen können optional in Druckausgaben oder Exportformaten mitgeführt werden. Die Verwaltungslogik für Notizen erfolgt direkt in der Kundendetailansicht über einen Richtext-Editor.

In der Kundendetailansicht können dem Kunden zusätzlich Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## Regeln & Randbedingungen

- Kundendaten (Name, Kundennummer, Adresse, Telefon) werden **zentral** am Kunden gepflegt.
- Bei Übernahme aus Doc Extract dürfen nur leere Bestandsfelder ergänzt werden, wenn der Akteur dies im Dialog bestätigt. Vorhandene Werte bleiben unverändert.
- Kunden dürfen **nicht gelöscht** werden, wenn sie in Projekten verwendet werden.
- Disponenten erhalten serverseitig nur aktive Kunden und können nur aktive Kunden für neue Projekte auswählen.
- Pflichtfelder:
    - Kundennummer (aus WAWI).
- Notizen sind optional und werden über die Relationstabelle `customer_note` mit dem Kunden verknüpft.

**Notizen an Kunden**

- Ein Kunde kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Kunden; Änderungen am Kunden (Adresse, Telefon, Status) wirken sich nicht auf die Notizen aus.
- Notizen werden nicht automatisch gelöscht, wenn ein Kunde bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder der gesamte Kunde gelöscht wird.
- Wenn ein Kunde gelöscht wird, werden auch seine zugeordneten Notizen entfernt.
- Notizen sind für alle zu einem Kunden gehörenden Projekte und Termine kontextabhängig sichtbar, sofern das jeweilige Feature dies vorsieht.
- Notizen können optional in Druckausgaben, CSV-Exporten oder anderen Exportformaten mitgeführt werden, sofern das jeweilige Feature dies vorsieht.
- Kundenanhänge sind kundenbezogen und unabhängig von Projekten; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## Use Cases

- [UC 09/01: Kunde anlegen](use-cases/uc-09-01-kunde-anlegen.md)
- [UC 09/02: Kunde bearbeiten](use-cases/uc-09-02-kunde-bearbeiten.md)
- [UC 09/03: Kunde anzeigen (inkl. Terminliste)](use-cases/uc-09-03-kunde-anzeigen-inkl-terminliste.md)
- [UC 09/04: Kunde deaktivieren / archivieren](use-cases/uc-09-04-kunde-deaktivieren-archivieren.md)
- [UC 09/06: Kunde reaktivieren](use-cases/uc-09-06-kunde-reaktivieren.md)
- [UC 09/07: Kundenanhänge verwalten](use-cases/uc-09-07-kundenanhaenge-verwalten.md)
- [UC 09/08: Versionskonflikt bei paralleler Kundenbearbeitung](use-cases/uc-09-08-versionskonflikt-bei-paralleler-kundenbearbeitung.md)
- [UC 09/09: Statuskonflikt bei parallelem Bearbeiten und Deaktivieren](use-cases/uc-09-09-statuskonflikt-bei-parallelem-bearbeiten-und-deaktivieren.md)
- [UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)](use-cases/uc-09-10-parallelkonflikt-bei-statuswechsel-deaktivieren-vs-reaktivieren.md)
- [UC 09/11: Rollenabhängige Filterung von Kundenlisten](use-cases/uc-09-11-rollenabhaengige-filterung-von-kundenlisten.md)
- [UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren](use-cases/uc-09-12-zugriff-auf-inaktiven-kunden-durch-disponent-blockieren.md)
- [UC 09/13: Kunde löschen ohne Referenzen](use-cases/uc-09-13-kunde-loeschen-ohne-referenzen.md)
- [UC 09/14: Kunde löschen mit Referenzen (Blockade)](use-cases/uc-09-14-kunde-loeschen-mit-referenzen-blockade.md)
- [UC 09/15: Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)](use-cases/uc-09-15-konsistenz-von-kundenlisten-bei-statusaenderung-multi-browser.md)
- [UC 09/16: Statusänderung des Kunden während Notiz- oder Attachment-Operation](use-cases/uc-09-16-statusaenderung-des-kunden-waehrend-notiz-oder-attachment-operation.md)
- [UC 09/17: Notiz an Kunde anlegen](use-cases/uc-09-17-notiz-an-kunde-anlegen.md)
- [UC 09/18: Notiz am Kunde bearbeiten](use-cases/uc-09-18-notiz-am-kunde-bearbeiten.md)
- [UC 09/19: Notiz von Kunde entfernen](use-cases/uc-09-19-notiz-von-kunde-entfernen.md)
- [UC 09/20: Notizen beim Kunde-Löschen entfernen](use-cases/uc-09-20-notizen-beim-kunde-loeschen-entfernen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
