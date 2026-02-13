# Alle Features

# FT (01): **Kalendertermine verwalten**

## Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermöglicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu ändern, zu verschieben, zuzuweisen und zu überwachen**, immer im Kontext eines Projekts.

FT (01) ist die **fachliche Quelle der Wahrheit für alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, überwachen oder ausgeben, leiten ihre Informationen **ausschließlich** aus den hier verwalteten Terminen ab.

## Fachliche Beschreibung

Ein Termin ist eine **zeitliche Planungseinheit** mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin gehört **immer genau zu einem Projekt**. Über das Projekt ist der Termin **indirekt** einem Kunden zugeordnet. Die Projekt-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen automatisch, durch Zuweisung von Mitarbeitern über eine Tour, ein Team oder individuell. Gespeichert wird am Termin jedoch stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte geführt, damit spätere Anforderungen an „echte Uhrzeiten“ ohne erneute Modellmigration möglich sind. In der UI bleiben Uhrzeiten zunächst optional, weil der aktuelle Arbeitsmodus weiterhin primär tagesbasiert ist.

Ein Termin kann:

- unabhängig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- über Teams mit Mitarbeitern belegt werden,
- über die Tourzuweisung mit Mitarbeitern belegt werden,
- Mitarbeiter können nur einmal im Termin existieren, keine Dupletten durch Team- oder Tourzuweisung,
- Mitarbeiter dürfen nur zugewiesen werden, wenn sich dadurch keine Überschneidungen mit anderen Terminen des Mitarbeiters ergeben,
- in verschiedenen Kalender- und Übersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine können auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschließender Projektzuweisung.

Unabhängig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gültig, wenn ihm ein Projekt zugeordnet ist.**

## Regeln & Randbedingungen

**Grundlegende Terminregeln**

- Ein Termin gehört **immer genau zu einem Projekt**.
- Ein Projekt kann **null, einen oder mehrere Termine** besitzen.
- Termine ohne Projektzuordnung sind **nicht zulässig**.
- Termine enthalten **keine eigenen Kunden- oder Projektdatenkopien**.
- Kunden- und Projektinformationen werden stets **referenziert**, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- Mehrtägige Termine gelten für **alle Tage ihres Zeitraums**.
- Vergangene Termine sind **read-only** und dürfen nicht verändert werden.
- Ein Termin besitzt intern einen Startzeitpunkt und einen Endzeitpunkt.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird eine Startuhrzeit erfasst, leitet das System initial eine Standarddauer von einer Stunde ab.

**Mitarbeiterzuweisung**

- Einem Termin können **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- Es dürfen nur **aktive Mitarbeiter** neuen oder zukünftigen Terminen zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich überschneidend** mehreren Terminen zugewiesen sein.
    
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelösten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Der Termin übernimmt die Mitarbeiter, die der Tour zugeordnet sind
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung.
- Das Wechseln der Tour entfernt die Mitarbeiter der vorherigen Tour vom Termin und fügt die der neuen Tour an
- Das Entfernen der Tour entfernt die Mitarbeiter der Tour vom Termin

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Der Termin übernimmt die Mitarbeiter des Teams

## **Use Cases**

### **UC: Termin anlegen**

**Akteur:** 

Disponent

**Ziel:**

Für ein bestehendes Projekt einen neuen Termin im Kalender anlegen. 

**Vorbedingungen:**

- Projekt existiert.

**Ablauf:**

1. Disponent wählt ein Projekt (z. B. aus der Projektübersicht) oder startet Neuer Termin aus Projekt
2. Disponent erfasst Startdatum und optional Enddatum, sowie optional eine Startuhrzeit
3. Disponent weist dem Termin optional eine Tour zu.
4. Disponent weist dem Termin optional ein Team zu
5. Disponent weist optional Mitarbeiter zu (manuell).
6. System prüft Mitarbeiter-Überschneidungen im Zeitraum. Mitarbeiter dürfen keine überschneidenden Termine haben.
7. System speichert den Termin und zeigt ihn im Kalender an.

**Alternativen:**

- Überschneidung erkannt → System blockiert und zeigt Konflikt.
- Abbruch → Termin wird nicht gespeichert.

**Ergebnis:**

Der Termin ist dem Projekt zugeordnet und im Kalender sichtbar (mit Tourfarbe oder Standardfarbe).

### **UC: Termin bearbeiten**

**Akteur:** 

Disponent

**Ziel:**

Einen bestehenden Termin ändern.

**Vorbedingungen:**

- Termin existiert.

**Ablauf:**

1. Disponent öffnet den Termin.
2. Disponent ändert Zeitraum, Tourzuweisung, Teamzuweisung und/oder Mitarbeiterzuweisung.
3. Disponent ändert optional die Startuhrzeit.
4. System prüft Mitarbeiter-Überschneidungen und vorhandene Mitarbeiter Termine.
5. System speichert die Änderungen.

**Alternativen:**

- Überschneidung → System blockiert und zeigt Konflikt.
- Abbruch → keine Änderung.

**Ergebnis:**

Der Termin ist aktualisiert und korrekt im Kalender dargestellt.

### **UC: Termin verschieben**

**Akteur:** 

Disponent

**Ziel:**

Einen Termin zeitlich verlegen.

**Vorbedingungen:**

- Termin existiert.

**Ablauf:**

1. Disponent wählt den Termin.
2. Disponent ändert Start- und/oder Enddatum oder alternativ er verschiebt den Termin in der Kalenderansicht mit der Maus.
3. Termin verschieben wird tageweise vorgenommen, auch wenn ein Termin eine Startuhrzeit hat. Diese Angabe belibt bei MAus-gesteuerten verschieben unverändert.
4. System prüft Mitarbeiter-Überschneidungen.
5. System speichert den neuen Zeitraum.

**Alternativen:**

- Überschneidung → System blockiert und zeigt Konflikt.

**Ergebnis:**

Der Termin ist im neuen Zeitraum im Kalender sichtbar.

### **UC: Termin löschen**

**Akteur:** 

Disponent

**Ziel:**

Einen Termin aus der Planung entfernen.

**Vorbedingungen:**

- Termin existiert.

**Ablauf:**

1. Disponent wählt den Termin.
2. Disponent bestätigt die Löschung.
3. System löscht den Termin.
4. Die Terminzuordnungen dieses Termins zu den am Termin hängenden Mitarbeitern, müssen entfernt werden.

**Alternativen:**

- Abbruch → Termin bleibt bestehen.

**Ergebnis:**

Der Termin ist gelöscht und nicht mehr im Kalender sichtbar.

### **UC: Tour einem Termin zuweisen**

**Akteur:** 

Disponent

**Ziel:**

Einem bestehenden Termin optional eine Tour zuweisen, um ihn organisatorisch zu gruppieren und farblich darzustellen.

**Vorbedingungen:**

- Termin existiert.
- Mindestens eine Tour existiert.

**Ablauf:**

1. Disponent wählt einen Termin.
2. Disponent weist dem Termin eine Tour zu.
3. Termin übernimmt die Mitarbeiter, die der Tour zugewiesen sind.
4. System prüfe ob es Terminüberscheidungen bei den Terminen der abngehängten Mitarbeiter gibt.
5. System speichert die Tourzuweisung.
6. System aktualisiert die Kalenderdarstellung (Tourfarbe).

**Alternativen:**

- Abbruch → keine Änderung.

**Ergebnis:**

Der Termin ist über die tour_id einer Tour zugeordnet und verwendet deren Farbinformation für die Darstellung.

Die zum Zeitpunkt der Zuweisung der Tour zugeordneten Mitarbeiter werden einmalig an den Termin übernommen.

### **UC: Tourzuweisung eines Termins entfernen**

**Akteur:** 

Disponent

**Ziel:**

Eine bestehende Tourzuweisung von einem Termin entfernen.

**Vorbedingungen:**

- Termin existiert.
- Dem Termin ist eine Tour zugewiesen.

**Ablauf:**

1. Disponent wählt den Termin.
2. Disponent entfernt die Tourzuweisung.
3. System entfernt die Mitarbeiter, die der Tour zugewiesen sind aus diesem Termin.
4. System speichert die Änderung.
5. System stellt den Termin im Kalender in der Standardfarbe dar.

**Alternativen:**

- Abbruch → keine Änderung.

**Ergebnis:**

Der Termin wird neutral dargestellt.

### **UC: Mitarbeiter über Team zuweisen**

**Akteur:** 

Disponent

**Ziel:**

Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen.

**Vorbedingungen:**

- Termin existiert.
- Mindestens eine Team existiert.

**Ablauf:**

1. Disponent wählt einen Termin.
2. Disponent wählt eine Team.
3. System übernimmt alle zugeordneten Mitarbeiter.
4. System prüft die Termine der angehängten Mitarbeiter auf Konflikte.
5. System prüft Mitarbeiter-Überschneidungen.
6. System speichert die Zuweisung.

**Alternativen:**

- Überschneidung → blockieren + Konflikt anzeigen.

**Ergebnis:**

Alle Mitarbeiter der Vorlage sind dem Termin zugewiesen.

### **UC: Mitarbeiter einem Termin zuweisen**

**Akteur:** 

Disponent

**Ziel:**

Einen einzelnen Mitarbeiter gezielt einem bestehenden Termin zuweisen.

**Vorbedingungen:**

- Termin existiert.
- Mitarbeiter existiert und ist aktiv.

**Ablauf:**

1. Disponent wählt einen Termin.
2. Disponent wählt einen einzelnen Mitarbeiter aus.
3. System prüft zeitliche Überschneidungen des Mitarbeiters im Terminzeitraum.
4. System speichert die Zuweisung.

**Alternativen:**

- Überschneidung erkannt → System blockiert und zeigt Konflikt.
- Abbruch → keine Änderung.

**Ergebnis:**

Der ausgewählte Mitarbeiter ist dem Termin zugewiesen.

# FT (02): Projekte

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition, **Projekte als zentrale fachliche Einheit** anzulegen, zu pflegen und in ihrem Lebenszyklus zu steuern.

Ein Projekt bildet den fachlichen Rahmen für alle zugehörigen Termine und bündelt alle projektbezogenen Informationen wie Beschreibung, Status, Notizen und Anhänge.

## Fachliche Beschreibung

Ein Projekt repräsentiert einen Auftrag oder Vorgang (z. B. Aufbau, Service, Nachbesserung).

Es ist immer genau **einem Kunden** zugeordnet und besitzt genau **einen Projektstatus** aus einer administrierbaren Statusliste.

Alle fachlichen Informationen, die **nicht terminspezifisch** sind, werden am Projekt gepflegt:

- eine ausführliche Projektbeschreibung (formatierter Text, z. B. Markdown),
- optionale Notizen (als eigenständiges Domainobjekt),
- projektbezogene Anhänge (z. B. Auftrag, Auftragsbestätigung, Pläne, Fotos).

Ein Projekt kann **ohne Termine** existieren.

Termine können ausschließlich **innerhalb eines Projekts** angelegt werden und dienen nur der zeitlichen Planung. (Termine Können auch im Kalender angelegt werden, wo dann die Projektzuordnung erfolgt.

Projekt-Details sind immer **projektweit gültig** und gelten automatisch für alle zugehörigen Termine. Aus Termin- oder Kalenderansichten können Projekt-Details eingesehen, jedoch nicht zwingend dort bearbeitet werden.

EIn Projekt kann mehrere Status Etiketten haben, die über eine n:m Beziehung organisiert werden.
Jedes Projekt besitzt ein **is_active** Flag (Standardwert: TRUE). Aktive Projekte erscheinen in den regulären Ansichten und Auswahllisten. Inaktive (archivierte) Projekte werden aus der täglichen Arbeit ausgeblendet, bleiben aber für historische Auswertungen vollständig erhalten und einsehbar.

In der Projektliste wird standardmäßig nur die für die Disposition relevante Arbeitsmenge angezeigt. Unter „Aktuelle Projekte“ versteht das System Projekte, die mindestens einen Termin besitzen, dessen Startdatum heute oder in der Zukunft liegt. Projekte ohne Termine sind im Standardfall bewusst ausgeblendet, weil sie nicht disponierbar sind. Über eine explizite Umschaltoption kann die Liste stattdessen auf „Projekte ohne Termine“ umgestellt werden; in diesem Modus werden ausschließlich Projekte angezeigt, die keinen Termin besitzen. Zusätzliche Filter wie Titel- oder Statusfilter wirken immer nur auf die jeweils geladene Projektmenge und definieren nicht die Grundmenge.

## Regeln & Randbedingungen

- Ein Projekt ist immer genau **einem Kunden** zugeordnet.
- 
- Jedes Projekt besitzt ein **is_active** Flag (Standardwert: TRUE).
- **Nur aktive Projekte** (is_active = TRUE):
    - erscheinen in regulären Projektlisten und Auswahlfeldern,
    - sind für die Disposition in der täglichen Arbeit sichtbar,
    - können neuen Terminen zugeordnet werden.
- **Inaktive Projekte** (is_active = FALSE):
    - werden physisch nicht gelöscht,
    - bleiben mit allen Terminen, Notizen und Anhängen erhalten,
    - sind in historischen Auswertungen und über Direktzugriff einsehbar,
    - dienen der Nachvollziehbarkeit abgeschlossener Vorgänge,
    - können reaktiviert werden.
- Ein Projekt hat einen oder mehrere **Status Flags**.
- Projektstatus werden in einer **eigenen Stammdatentabelle** gepflegt.
    - Default-Statuswerte sind geschützt und nicht löschbar.
- Ein Projekt kann ohne Termine existieren.
- Termine können nur für existierende Projekte angelegt werden.
- Projekt-Details (Beschreibung, Notizen, Anhänge) gehören **ausschließlich** zum Projekt, nicht zum Termin.
- Notizen sind optional und frei pflegbar.
- Anhänge sind optional; ein Projekt kann mehrere Anhänge besitzen.
- Anhänge sind dauerhaft dem Projekt zugeordnet.
- Das physische Löschen eines Projekts ist nur zulässig, wenn keine Termine existieren; alternativ wird das Projekt deaktiviert bzw. abgeschlossen.

## **Use Cases**

### **UC: Projekt anlegen**

**Akteur:** RO (01): Disponent 

**Ziel:**

Ein neues Projekt erfassen, einem Kunden zuordnen und einen initialen Status setzen.

**Vorbedingungen:**

- Kunde existiert.
- Mindestens ein Projektstatus existiert.

**Ablauf:**

1. Disponent startet „Projekt anlegen“.
2. Disponent wählt einen Kunden.
3. Disponent erfasst Titel und optional eine Beschreibung (Markdown).
4. Disponent wählt einen Projektstatus (Default z. B. „In Planung“).
5. System speichert das Projekt.

**Ergebnis:**

Projekt existiert und kann für Terminplanung genutzt werden.

### **UC: Projekt bearbeiten**

**Akteur:** RO (01): Disponent 

**Ziel:**

Projektdaten und fachliche Inhalte ändern.

**Vorbedingungen:**

Projekt existiert.

**Ablauf:**

1. Disponent öffnet ein Projekt.
2. Disponent ändert zulässige Felder (Titel, Kunde, Status, Beschreibung).
3. System speichert die Änderungen.

**Ergebnis:**

Projekt ist aktualisiert.

### **UC: Projekt anzeigen**

**Akteur:** RO (01): Disponent 

**Ziel:**

Alle fachlichen Informationen eines Projekts einsehen.

**Vorbedingungen:**

Projekt existiert.

**Ablauf:**

1. Benutzer öffnet ein Projekt (direkt oder über einen Termin).
2. System zeigt Projektdaten, Beschreibung, Notizen, Anhänge und zugehörige Termine an.

**Ergebnis:**

Vollständiger Überblick über das Projekt.

### **UC: Projektstatus ändern**

**Akteur:** RO (01): Disponent 

**Ziel:**

Den aktuellen Projektstatus anpassen.

**Vorbedingungen:**

Projekt existiert.

**Ablauf:**

1. Disponent öffnet ein Projekt.
2. Disponent wählt einen neuen Status.
3. System speichert die Änderung.

**Ergebnis:**

Projekt befindet sich im neuen Status.

### **UC: Projektstatus verwalten**

**Akteur:** RO (03): Admin 

**Ziel:**

Projektstatusliste administrativ pflegen.

**Vorbedingungen:**

Admin ist angemeldet.

**Ablauf:**

1. Admin öffnet die Statusverwaltung.
2. Admin kann Status anlegen, sortieren und aktivieren/deaktivieren.
3. Default-Statuswerte können nicht gelöscht werden.
4. System speichert Änderungen.

**Ergebnis:**

Aktualisierte Statusliste steht Projekten zur Verfügung.

### **UC: Projektnotizen pflegen**

**Akteur:** RO (01): Disponent 

**Ziel:**

Zusätzliche projektbezogene Notizen erfassen oder ändern.

**Vorbedingungen:**

Projekt existiert.

**Ablauf:**

1. Disponent öffnet das Projekt.
2. Disponent ergänzt oder ändert Notizen.
3. System speichert die Änderungen.

**Ergebnis:**

Notizen sind dem Projekt zugeordnet und verfügbar.

### **UC: Projektanhänge verwalten**

**Ziel:**

Dokumente zu einem Projekt hinzufügen und projektbezogene Anhänge einsehen bzw. herunterladen.

**Vorbedingungen:**

Projekt existiert.

**Ablauf:**

1. Disponent öffnet das Projekt.
2. Das System zeigt die Liste der vorhandenen Anhänge an (mit Metadaten wie Dateiname und Zeitstempel, sofern verfügbar).
3. Disponent fügt einen oder mehrere Anhänge hinzu (Upload).
4. Das System ordnet die hochgeladenen Dateien dem Projekt zu und speichert die Änderungen.
5. Disponent kann vorhandene Anhänge öffnen (Preview) oder herunterladen.

**Alternativabläufe:**

- Upload abgebrochen oder Datei ungültig: Das System speichert keinen neuen Anhang und zeigt eine verständliche Fehlermeldung.
- Anhänge können nicht gelöscht werden: Eine „Entfernen/Löschen“-Aktion wird nicht angeboten.

**Ergebnis:**

Anhänge sind korrekt dem Projekt zugeordnet und für alle Termine verfügbar.

### **UC: Projekt deaktivieren / archivieren**

**Akteur:** RO (01): Disponent 

**Ziel:**

Ein Projekt aus der täglichen Arbeit ausblenden, ohne die Historie zu verlieren.

**Vorbedingungen:**

- Das Projekt existiert und ist aktiv (is_active = TRUE).

**Ablauf:**

1. Disponent öffnet ein Projekt.
2. Disponent wählt „Projekt deaktivieren / archivieren".
3. Das System zeigt eine Bestätigung an.
4. Disponent bestätigt die Deaktivierung.
5. Das System setzt is_active auf FALSE.
6. Das System speichert die Änderung.

**Alternativabläufe:**

- Abbruch: Keine Änderung, Projekt bleibt aktiv.

**Ergebnis:**

Das Projekt ist deaktiviert und erscheint nicht mehr in regulären Projektlisten und Auswahlfeldern.

Alle Termine, Notizen, Anhänge und Status-Zuordnungen bleiben vollständig erhalten.

Das Projekt ist weiterhin über Direktzugriff und in historischen Auswertungen einsehbar.

### **UC: Projekt reaktivieren**

**Akteur:** RO (01): Disponent

**Ziel:**

Ein deaktiviertes Projekt wieder in die aktive Nutzung aufnehmen.

**Vorbedingungen:**

- Das Projekt existiert und ist deaktiviert (is_active = FALSE).

**Ablauf:**

1. Disponent öffnet ein deaktiviertes Projekt (z.B. über Suche oder historische Ansicht).
2. Disponent wählt „Projekt reaktivieren".
3. Das System setzt is_active auf TRUE.
4. Das System speichert die Änderung.

**Ergebnis:**

Das Projekt ist wieder aktiv und erscheint in allen regulären Ansichten und Auswahlfeldern.

### UC: Projekte anzeigen

**Akteur:** Disponent

**Ziel:** Der Disponent sieht eine für die tägliche Arbeit passende Projektliste und kann bei Bedarf auf Projekte ohne Termine umschalten.

**Vorbedingungen:** Projekte sind im System vorhanden.

**Auslöser:** Der Disponent öffnet die Projektübersicht.

**Ablauf:** Der Disponent öffnet die Projektübersicht. Das System lädt standardmäßig die Projektmenge „Aktuelle Projekte“ und zeigt sie an. Der Disponent kann die Umschaltoption „Ohne Termine“ aktivieren; das System lädt dann ausschließlich Projekte ohne Termine und zeigt diese an. Der Disponent kann zurück auf „Aktuelle Projekte“ umschalten; das System lädt wieder die Standardmenge.

**Ergebnis:** Der Disponent sieht entweder die aktuellen Projekte oder ausschließlich Projekte ohne Termine, jeweils als klar getrennte Mengen.

# FT (03): Kalenderansichten

## Ziel / Zweck

Dieses Feature stellt Kalenderansichten bereit, um Termine über definierte Zeiträume hinweg übersichtlich darzustellen und die Disposition bei der Orientierung und Planung zu unterstützen. Es enthält ausschließlich Anzeige-, Navigations- und Drilldown-Funktionen und verändert keine Termindaten.

## Fachliche Beschreibung

Die Anwendung visualisiert Termine in periodischen Kalenderansichten (Woche, Monat, mehrmonatige Übersicht, Jahresübersicht). Termine werden als **farbige Balken** dargestellt, deren Farbe aus der **Tourzuordnung** abgeleitet wird. Der Balken deckt den vollständigen Zeitraum des Termins ab und zeigt kompakt **Kundenname** und **Postleitzahl** an. 
FT (03) Terminplanung und Kalen…

Zusätzlich bietet jeder Termin einen **Tooltip** in Form einer größeren Informationskarte. Diese Karte fasst Informationen aus **Projekt**, **Kunde** und **Team/Mitarbeiterzuweisung** zusammen. Die Informationen werden aus den bestehenden Beziehungen abgeleitet (Termin → Projekt → Kunde sowie Termin → Mitarbeiter und optional Termin → Tour).

Die Ansichten müssen „heruntergebrochen“ werden können, also die Kalenderdarstellung muss wahlweise auf **Tour**, **Team** oder **Mitarbeiter** fokussiert werden, ohne dass sich die Terminlogik ändert.

## Regeln & Randbedingungen

Die Kalenderansichten sind Dispositionsoberflächen und nicht nur Anzeigeansichten. In allen Kalenderansichten können Termine über den `+`-Button pro Kalendertag angelegt werden, und Termine können per Drag & Drop verschoben werden. Beide Aktionen sind fachliche Änderungen und gehören zum Kernprozess der Disposition.

Für das Anlegen und Bearbeiten von Terminen wird ausschließlich das in **FT (01)** definierte Terminformular verwendet. Die Kalenderansichten führen keine eigene Logik zum Erstellen oder Editieren von Terminen ein, sondern öffnen das bestehende Formular im passenden Modus. Beim Klick auf `+` wird das Formular im Modus „Neuer Termin“ geöffnet und das Startdatum wird auf den angeklickten Tag gesetzt. Beim Klick auf einen bestehenden Termin wird das Formular im Modus „Termin bearbeiten“ geöffnet.

Für alle ändernden Aktionen gelten die gleichen Sperr- und Rollenregeln wie beim Bearbeiten eines Termins. Ein Termin darf ab seinem Starttag von normalen Benutzern nicht mehr geändert werden. Administratoren dürfen diese Sperre übersteuern und Termine auch nachträglich verändern. In gesperrten Fällen sind Drag & Drop sowie das Bearbeiten über Klick zu verhindern oder eindeutig mit einer Fehlermeldung abzulehnen.

Das Verschieben eines Termins per Drag & Drop führt immer zu einer deterministischen Neuordnung der Termindarstellung in allen betroffenen Kalendertagen. Betroffen sind mindestens der Quelltag und der Zieltag, bei mehrtägigen Terminen alle Tage der Termindauer. Nach dem Drop müssen die Platzierungs- und Sortierregeln erneut angewendet werden, damit die Darstellung konsistent bleibt und keine visuellen Überschneidungen entstehen.

Die Monats- und Jahresansicht nutzen eine kompakte Termindarstellung als farbigen waagerechten Balken. Dieser Balken muss mindestens Kundennummer, Postleitzahl und Projekttitel darstellen können. Welche Teile tatsächlich sichtbar sind, richtet sich nach der verfügbaren Breite des Balkens; bei geringer Breite werden Informationen gekürzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht.

Die Wochenansicht nutzt eine detailreichere Termindarstellung als größere Fläche. Diese Darstellung muss Projekttitel, Projektbeschreibung und Projektstatus anzeigen können sowie vom Kunden mindestens Kundennummer und Name. Zusätzlich muss sie die dem Termin zugewiesenen Mitarbeiter anzeigen können. Die Wochenansicht kann kollabierbare Reihen oder Bereiche besitzen; dies verändert die Informationsdichte, aber nicht die fachlichen Regeln.

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bündelt. Dieses Popover muss mindestens den Informationsumfang der detailreichen Termindarstellung der Wochenansicht bereitstellen. Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern das die Bedienbarkeit verbessert; es dürfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

Die Kalenderansichten benötigen für die dargestellten Termine Zugriff auf Projekt- und Kundendaten sowie auf die Mitarbeiterzuordnungen. Diese Informationen dürfen serverseitig zusammengeführt oder bei Bedarf nachgeladen werden, solange die Oberfläche ohne spürbare Verzögerung bedienbar bleibt. Mouse-Over darf Details nachladen, muss jedoch pro Termin zwischenspeichern, damit wiederholtes Hovering keine wiederholten Ladevorgänge auslöst.

## Darstellung

## Gesamtkonzept: Einheitliche Logik, verschiedene Render-Modi

In den drei Hauptansichten **Woche**, **Monat** und **Jahr** werden Termine grundsätzlich einheitlich visualisiert, jedoch mit unterschiedlichen Informationsdichten. Die **grafische Grundstruktur der Kalendertage** (Raster, Tageskacheln, Kopfzeilen, etc.) bleibt unverändert. Der Unterschied liegt ausschließlich in der Art, wie Termine innerhalb der Tagesflächen angeordnet und gerendert werden.

Die Kalenderansichten können sowohl als eigenständige Ansicht als auch innerhalb eines **Dialogs/Popups** geöffnet werden. Die Darstellung und Interaktionsregeln bleiben dabei identisch; der Dialogmodus ist ausschließlich eine alternative Einbettung mit reduziertem Kontext.

In allen Kalenderansichten muss eine **Filtermöglichkeit nach Mitarbeiter** vorgesehen werden. Der Filter wirkt auf die dargestellten Termine und reduziert die sichtbaren Termine auf solche, denen der gewählte Mitarbeiter zugewiesen ist. Der Filter darf optional Mehrfachauswahl unterstützen, muss aber mindestens die Auswahl eines einzelnen Mitarbeiters ermöglichen.

Ein Termin ist ein Zeitraum mit **Startdatum** und optional **Enddatum**. Ein Termin kann optional einer **Tour** zugeordnet sein. Eine Tour besitzt eine **individuelle Farbe**, die die Terminfarbe bestimmt. Ist keine Tour zugeordnet, wird eine **neutrale Farbe** verwendet.

Ein Termin kann optional eine **Startzeit** haben. Solche Termine werden als **Intraday-Termine** bezeichnet. Intraday-Termine werden optisch weiterhin wie Ein-Tages-Termine behandelt, d. h. sie sind nicht als „stundenbasierte Zeitleiste“ darzustellen. Die Startzeit wird lediglich als zusätzliche Information im Termin angezeigt und beeinflusst die Sortierung.

## Begriffe und Layout-Grundlage

Kalendertage sind innerhalb einer Ansicht in einem Raster angeordnet. Zur Vereinfachung wird die sichtbare Fläche eines einzelnen Kalendertags als **Tag** bezeichnet.

Termine werden innerhalb eines Tags nicht übereinander gelegt, sondern vertikal in **Zeilen** organisiert. Diese Zeilen heißen im Folgenden **Lanes** (oder Slots). Eine Lane ist eine reine Organisations- und Positionierungshilfe und ist in der UI nicht als eigene Linie sichtbar.

Die konkrete Höhe einer Lane hängt vom jeweiligen Darstellungsmodus (kompakt oder detailliert) und den verwendeten UI-Komponenten (Schrifthöhen, Padding, etc.) ab.

## Lane-System: Ziel und Grundregeln

Das Lane-System hat zwei Ziele.

Erstens soll es sicherstellen, dass mehrere Termine am selben Tag **nicht überlappen**, sondern vertikal untereinander dargestellt werden.

Zweitens soll es, wo möglich, Termine gleicher Tour so anordnen, dass sie visuell als zusammengehörige „Spur“ wahrgenommen werden.

Die Lane-Zuordnung wird **nicht** aus global existierenden Touren abgeleitet, sondern aus den Terminen, die im jeweiligen sichtbaren Abschnitt tatsächlich vorkommen. Dadurch bleibt die Darstellung kompakt und wächst nur dort, wo es wirklich nötig ist.

### Lane-Zuordnung

Für die Lane-Zuordnung wird pro sichtbarem Abschnitt (je nach Ansicht) eine Lane-Struktur berechnet.

In der **Monatsansicht** und **Jahresansicht** wird die Lane-Struktur pro **Kalenderreihe** (also pro Wochenzeile im Raster) bestimmt.

In der **Wochenansicht** wird die Lane-Struktur pro **Woche** (bzw. pro dargestelltem Wochenabschnitt) bestimmt.

Für jede Tour, die in diesem Abschnitt vorkommt, existiert mindestens eine Lane. Zusätzlich existiert eine Lane für **Termine ohne Tour**, die unterhalb der Tour-Lanes liegt. Damit ergibt sich eine stabile vertikale Grundordnung: „Tour-Lanes oben, tourlose Termine darunter“.

## Darstellung eines Termins: Balken über mehrere Tage

Termine werden grundsätzlich als **waagerechte Elemente** dargestellt, die sich über die Tage spannen, die zum Termin gehören.

Ein Ein-Tages-Termin belegt nur den Tag des Startdatums.

Ein Mehrtages-Termin überspannt alle Tage vom Startdatum bis einschließlich Enddatum.

Intraday-Termine (mit Startzeit) werden geometrisch wie Ein-Tages-Termine behandelt. Ein Intraday-Termin hat kein abweichendes Enddatum. Der Unterschied besteht lediglich darin, dass die Startzeit angezeigt wird und die Sortierung innerhalb einer Lane beeinflusst wird.

Die Farbe des Termin-Elements folgt der Tourfarbe oder ist neutral, wenn keine Tour zugeordnet ist.

## Konflikte innerhalb einer Lane: Mehrere Termine am selben Tag

Wenn innerhalb derselben Lane am selben Tag mehrere Termine angezeigt werden müssen, werden diese innerhalb der Lane vertikal gestapelt. Dabei gilt.

Zuerst werden All-day- und Mehrtages-Termine platziert.

Danach werden Intraday-Termine platziert.

Intraday-Termine werden nach Startzeit aufsteigend sortiert.

Bei gleichen Startzeiten wird als Tie-Breaker eine stabile Sortierung verwendet (z. B. ID).

In der Monats- und Jahresansicht wird die erforderliche Höhe pro Reihe so bestimmt, dass alle Stapelungen in dieser Reihe sichtbar sind, oder es wird eine explizit definierte Verdichtungsregel verwendet.

In der Wochenansicht ist eine variable Höhe aufgrund von Detaildarstellung zulässig.

## Render-Modi: Kompakt vs. Detailliert

Damit die Darstellung in Woche, Monat und Jahr konsistent bleibt, wird zwischen zwei Render-Modi unterschieden.

### Kompakter Modus (Balken)

Der Termin wird als flacher Balken dargestellt. Der Balken muss mindestens folgende Informationen darstellen können.

Erstens die **Kundennummer**.

Zweitens die **Postleitzahl**.

Drittens den **Projekttitel**.

Abhängig von der verfügbaren Breite werden Teile dieser Informationen gekürzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht. Intraday-Termine zeigen zusätzlich die Startzeit.

Dieser Modus ist der Standard in **Monatsansicht** und **Jahresansicht**.

### Detaillierter Modus (Termin-Panel)

Der Termin wird als größere Fläche dargestellt. Diese Darstellung muss mindestens folgenden Informationsumfang abbilden können.

Vom Projekt müssen **Titel**, **Beschreibung** und **Status** dargestellt werden.

Vom Kunden müssen mindestens **Kundennummer** und **Name** dargestellt werden.

Außerdem müssen die dem Termin **zugewiesenen Mitarbeiter** dargestellt werden können.

Dieser Modus wird in der **Wochenansicht** genutzt.

## Popover bei Mouse-Over

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bündelt. Dieses Popover muss mindestens den Informationsumfang des detaillierten Termin-Panels enthalten und darf dieselben Inhaltsbausteine wiederverwenden, damit keine abweichenden Varianten entstehen.

Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern dies die Bedienbarkeit verbessert. Es dürfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

## Wochenansicht: Detailkarten und Kollabierbarkeit

In der Wochenansicht gelten dieselben Lane-Regeln wie oben. Die Darstellung innerhalb einer Lane ist kollabierbar, d. h. Termine können zwischen kompakt und detailliert wechseln.

Die Lane-Reihenfolge bleibt stabil.

Die Höhe darf sich verändern, wenn Termin-Panels aufgeklappt werden.

Die Interaktion „Alle aufklappen“ wirkt als globaler Schalter für diesen Render-Modus.

## Monatsansicht: Balken und Reihenstabilität

In der Monatsansicht dominiert der kompakte Balkenmodus.

Alle Tage einer Kalenderreihe werden gleich hoch dargestellt.

Die erforderliche Reihenhöhe wird so berechnet, dass die maximal benötigte Slot-/Stapelanzahl innerhalb dieser Reihe passt.

Wenn die Zahl der Termine in einer Reihe sehr hoch ist, wird eine explizite Verdichtung verwendet, zum Beispiel „Anzeige nur der ersten N Termine“ und eine Kennzeichnung wie „+X weitere“. Die konkrete Verdichtung muss explizit festgelegt werden, damit das Verhalten deterministisch bleibt.

## Jahresansicht: Stark verdichtete Darstellung

In der Jahresansicht ist die Tagesfläche noch kleiner als im Monat.

Es wird grundsätzlich im kompakten Balkenmodus gerendert.

Informationen werden maximal reduziert.

Verdichtung ist typischerweise zwingend, wenn viele Termine auftreten.

## Drag & Drop: Verschieben von Terminen

Termine können per Drag & Drop verschoben werden.

Das Neupositionieren eines Termins löst eine Neuberechnung der Lane-Zuordnung in den betroffenen sichtbaren Abschnitten aus.

Betroffen sind die Abschnitte, in denen der Termin vorher lag, und die Abschnitte, in denen er nachher liegt.

Bei Mehrtages-Terminen betrifft dies alle Abschnitte, die von der Spanne des Termins geschnitten werden.

Nach dem Drop müssen Sortierung und Lane-Zuordnung wieder deterministisch nach denselben Regeln hergestellt werden.

# **Use Cases**

### **UC: UC: Kalenderansicht anzeigen (Woche/Monat/Mehrmonat/Jahr)**

Der Benutzer wählt eine der periodischen Ansichten und erhält die Terminbalken inklusive Kundenname und Postleitzahl.

### **UC: Kalenderzeitraum wechseln**

Der Benutzer navigiert vor/zurück oder wählt ein Datum; das System aktualisiert die Anzeige.

### **UC: Tourbezogene Planung anzeigen**

Der Benutzer wählt eine Tour; das System zeigt die Termine dieser Tour im gewählten Zeitraum.

### UC: Darstellung auf Mitarbeiter fokussieren

Der Benutzer wählt einen Mitarbeiter; das System zeigt dessen Termine im gewählten Zeitraum.

### UC: Darstellung auf Team fokussieren

Der Benutzer wählt eine Team (oder eine Team-Definition, falls später echte Teams kommen); das System zeigt die zugehörigen Termine im Zeitraum.

# FT (04): Tourenplanung

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition die Verwaltung von Touren zur logischen Gruppierung von Terminen im Kalender. Touren dienen ausschließlich der organisatorischen Bündelung und der visuellen Orientierung innerhalb der Terminplanung.

## Fachliche Beschreibung

Eine Tour ist eine abstrakte Planungseinheit, mit der mehrere Termine logisch zusammengefasst werden können. Touren haben keinen fachlichen Bezug zu Fahrzeugen, Routen oder Arbeitszeiten. Sie dienen ausschließlich der Strukturierung und besseren Übersicht in der Terminplanung. Touren fungieren auch als Gruppenvorlage für die zeitweilige Gruppierung von Mitarbeitern.

Termine können einer Tour zugeordnet oder aus einer Tour entfernt werden. Alle Termine einer Tour teilen sich eine gemeinsame Farbe, die im Kalender als zentrales visuelles Ordnungsmerkmal dient. Zusätzlich zeigen Termine ihre Postleitzahl an, um eine grobe räumliche Orientierung innerhalb einer Tour zu ermöglichen.

Touren können manuell angelegt und bearbeitet werden. Eine Übersicht ermöglicht es, alle einer Tour zugeordneten Termine gesammelt anzuzeigen. Touren enthalten selbst keine Terminlogik und keine zeitliche oder räumliche Auswertungsfunktion.

## Regeln & Randbedingungen

- Eine Tour dient ausschließlich der organisatorischen Gruppierung von Terminen.
- Touren sind nicht an Fahrzeuge oder feste Ziele gebunden.
- Ein Termin kann maximal einer Tour zugeordnet sein.
- Eine Tour kann mehrere Termine enthalten.
- Die Farbe einer Tour ist das primäre visuelle Identifikationsmerkmal im Kalender.
- Touren enthalten keine Routen-, Zeit- oder Entfernungslogik.
- Touren dürfen keine implizite Fahrzeugbedeutung haben.
- Eine Tour kann nur gelöscht werden, wenn ihr keine Termine mehr zugeordnet sind.
- Tour erhält eine **Mitarbeiterzuordnung** (0..n).
- **Mitarbeiter kann nur einer Tour angehören** (0..1 aus Sicht Mitarbeiter).
- Mehrere Mitarbeiter können einer Tour zugewiesen werden
- Löschen einer Tour: weiterhin nur, wenn keine Termine zugeordnet sind, aber zusätzlich: **keine Kaskade**, sondern nur Mitarbeiter.Tour_ID auf NULL/0 setzen. (Die bestehende Löschregel “nur wenn keine Termine” steht bereits drin.)

## **Use Cases**

### **UC: Tour anlegen - implementiert**

**Akteur:** RO (01): Disponent

**Ziel**

Anlegen einer neuen Tour zur Gruppierung von Terminen im Kalender.

**Beschreibung**

Die Disponentin legt eine neue Tour an, um mehrere Termine logisch zusammenzufassen und im Kalender visuell zu kennzeichnen. Die Tour dient ausschließlich der Organisation und Orientierung und ist nicht an Personal, Fahrzeuge oder Routen gebunden.

**Vorbedingungen**

- Die Disponentin ist angemeldet
- Das System ist betriebsbereit
- Die Tourenverwaltung ist verfügbar

**Ablauf**

1. Die Disponentin öffnet die Tourenverwaltung
2. Die Disponentin wählt die Funktion „Tour anlegen“
3. Das System zeigt ein Eingabeformular für die Tour
4. Die Disponentin gibt einen Namen für die Tour ein
5. Die Disponentin wählt eine Farbe aus
6. Optional hinterlegt die Disponentin eine Beschreibung
7. Die Disponentin bestätigt die Eingabe
8. Das System legt die Tour an und speichert sie

**Alternativabläufe**

- Die Disponentin bricht den Vorgang vor dem Speichern ab
- Pflichtfelder sind nicht ausgefüllt, das System fordert zur Korrektur auf
- Die gewählte Farbe ist nicht verfügbar, das System schlägt eine Alternative vor

**Ergebnis**

Die neue Tour ist im System angelegt, aktiv und kann Terminen zugeordnet werden.

### **UC: Tour bearbeiten - implementiert**

**Akteur:** RO (01): Disponent

**Ziel**

Ändern der Eigenschaften einer bestehenden Tour.

**Beschreibung**

Die Disponentin bearbeitet eine vorhandene Tour, um deren Name, Farbe oder Beschreibung anzupassen. Die Änderungen dienen der besseren Übersicht und Organisation bereits bestehender oder geplanter Termine.

**Vorbedingungen**

- Die Disponentin ist angemeldet
- Mindestens eine Tour ist im System vorhanden
- Die Tourenverwaltung ist verfügbar

**Ablauf**

1. Die Disponentin öffnet die Tourenverwaltung
2. Die Disponentin wählt eine bestehende Tour aus
3. Die Disponentin wählt die Funktion „Tour bearbeiten“
4. Das System zeigt die aktuellen Tourdaten an
5. Die Disponentin ändert Name, Farbe und/oder Beschreibung
6. Die Disponentin bestätigt die Änderungen
7. Das System speichert die Änderungen

**Alternativabläufe**

- Die Disponentin bricht den Bearbeitungsvorgang ab
- Pflichtfelder sind ungültig oder leer, das System fordert zur Korrektur auf
- Die gewählte Farbe ist nicht verfügbar, das System verlangt eine neue Auswahl

**Ergebnis**

Die Tour ist aktualisiert. Alle zugeordneten Termine werden sofort mit den geänderten Eigenschaften dargestellt.

### UC: Mitarbeiter einer Tour zuweisen

**Akteur:** RO (01): Disponent 

**Ziel**

Eine bestehende Tour-Vorlage anpassen, z. B. Mitarbeiter hinzufügen oder entfernen.

**Vorbedingungen**

- Die Tour-Vorlage existiert.
- Der Disponent ist berechtigt.

**Auslöser**

Der Disponent wählt eine bestehende Tour zur Bearbeitung aus.

**Ablauf**

1. Der Disponent öffnet eine >Tour 
2. Das System zeigt zugeordnete Mitarbeiter an.
3. Der Disponent ändert  Mitarbeiterliste.
4. Der Disponent bestätigt die Änderungen.
5. Das System speichert die aktualisierte Tour.

**Alternativabläufe**

- Abbruch: Das System verwirft die Änderungen.
- Ungültige Auswahl (z. B. kein Mitarbeiter): Das System speichert nicht.

**Ergebnis**

Die Tour-Vorlage ist aktualisiert und steht in der neuen Zusammensetzung zur Verfügung.

# FT (05): Mitarbeiterverwaltung

## Ziel / Zweck

Dieses Feature dient der zentralen Verwaltung von Mitarbeitern als ausführende Ressourcen für Termine. Ziel ist es, Mitarbeiter als Stammdaten zu pflegen und ihre Einsätze über Termine hinweg nachvollziehbar darzustellen, ohne Terminplanung und Ressourcendarstellung fachlich zu vermischen.

## Fachliche Beschreibung

Die Mitarbeiterverwaltung stellt Funktionen zum Anlegen, Bearbeiten, Anzeigen und Deaktivieren von Mitarbeitern bereit. Mitarbeiter können unabhängig von Terminen existieren und werden im Rahmen der Terminvergabe optional Terminen zugewiesen. Die Zuweisung selbst erfolgt nicht innerhalb dieses Features, sondern im Kontext der Terminplanung.

Jeder Mitarbeiter besitzt ein Status-Flag **is_active** (Standardwert: TRUE). Nur aktive Mitarbeiter stehen in der Anwendung für Funktionen wie Terminzuweisung, Tour-Zuordnung oder Team-Zuordnung zur Verfügung. Deaktivierte Mitarbeiter bleiben in der Datenbank erhalten und sind ausschließlich in der Mitarbeiterübersicht sichtbar, um ihre vollständige Terminhistorie nachvollziehbar zu halten. Dies gewährleistet, dass jederzeit ersichtlich ist, welcher Mitarbeiter bei welchem Kunden im Einsatz war.

Für jeden Mitarbeiter ist eine Terminübersicht verfügbar. Diese Übersicht zeigt alle Termine, denen der Mitarbeiter aktuell oder in der Vergangenheit zugewiesen war, und bildet damit die Einsatzhistorie des Mitarbeiters ab. Die Terminliste wird ausschließlich aus der Relation zwischen Termin und Mitarbeiter abgeleitet und ist jederzeit vollständig einsehbar.

Änderungen an zukünftigen Terminen wirken sich unmittelbar auf die Terminliste eines Mitarbeiters aus. Vergangene Termine sind read-only und dürfen nicht nachträglich verändert werden, um die Stabilität der Einsatzhistorie sicherzustellen.

In der Terminübersicht eines Mitarbeiters sind neben Zeitraum und Bezeichnung des Termins auch die zugehörige Tour sowie der Kunde erkennbar, da Termine diese Informationen referenzieren.

In der Mitarbeiterdetailansicht können dem Mitarbeiter Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

In der Mitarbeiterliste wird standardmäßig nur die Arbeitsmenge „Aktive Mitarbeiter“ angezeigt. Dadurch werden inaktive Mitarbeiter aus der täglichen Disposition ausgeblendet, bleiben aber weiterhin vollständig im System vorhanden. Über eine explizite Option „Alle“ kann die Liste auf „Aktiv und inaktiv“ umgestellt werden. Der Namensfilter wirkt immer nur auf die jeweils geladene Mitarbeitermenge und definiert nicht die Grundmenge.

## Regeln & Randbedingungen

- Mitarbeiter können unabhängig von Terminen existieren.
- Die Zuweisung eines Mitarbeiters zu einem Termin ist optional.
- Ein Mitarbeiter kann einem oder mehreren Terminen zugewiesen sein.
- Jeder Mitarbeiter besitzt ein Status-Flag **is_active** (Standardwert: TRUE).
- **Nur aktive Mitarbeiter** dürfen:
    - neuen oder zukünftigen Terminen zugewiesen werden,
    - Touren zugeordnet werden,
    - Teams zugeordnet werden,
    - in Auswahlisten für Planungsfunktionen erscheinen.
- **Deaktivierte Mitarbeiter**:
    - werden physisch nicht gelöscht,
    - bleiben in allen bestehenden Terminen und Relationen sichtbar,
    - sind ausschließlich in der Mitarbeiterübersicht einsehbar,
    - dienen der Nachvollziehbarkeit der Einsatzhistorie,
    - können reaktiviert werden, indem is_active wieder auf TRUE gesetzt wird.
- Die Terminliste eines Mitarbeiters wird ausschließlich aus den aktuellen Termindaten abgeleitet.
- Vergangene Termine sind read-only und dürfen nicht verändert werden.
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf dieser Termin nicht mehr in der Terminliste des abgelösten Mitarbeiters erscheinen.
- Es dürfen keine widersprüchlichen Zustände entstehen, bei denen ein Mitarbeiter als zugewiesen gilt, ohne dass ein entsprechender Termin existiert.
- Mitarbeiter existieren unabhängig von Tour-Zugehörigkeit und Team-Zugehörigkeit. Löschungen von Tour oder Team wirken sich nur auf die FK-Eigenschaften des Mitarbeiters aus (Setzen auf NULL).
- Mitarbeiteranhänge sind mitarbeiterbezogen und unabhängig von Terminen; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## **Use Cases**

### **UC: Mitarbeiter anlegen**

**Akteur**

Disponent

**Ziel**

Einen neuen Mitarbeiter mit Stammdaten erfassen.

**Vorbedingungen**

- Keine.

**Ablauf**

1. Benutzer erfasst den Namen des Mitarbeiters.
2. Benutzer erfasst optionale Stammdaten.
3. Das System speichert den Mitarbeiter.

**Ergebnis**

Der Mitarbeiter ist angelegt und steht für Terminzuweisungen zur Verfügung.

### **UC: Mitarbeiter bearbeiten**

**Akteur**

Disponent

**Ziel**

Stammdaten eines bestehenden Mitarbeiters ändern.

**Vorbedingungen**

- Der Mitarbeiter existiert.

**Ablauf**

1. Benutzer öffnet die Mitarbeiterdetails.
2. Benutzer ändert die Stammdaten.
3. Das System speichert die Änderungen.

**Ergebnis**

Die Mitarbeiterdaten sind aktualisiert.

### **UC: Mitarbeiter-Termine anzeigen**

**Akteur**

Leser (z. B. Monteur, berechtigte Mitarbeiter)

**Ziel**

Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.

**Vorbedingungen**

- Der Mitarbeiter existiert.
- Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.

**Auslöser**

Der Nutzer wählt einen Mitarbeiter zur Anzeige aus.

**Ablauf**

1. Der Nutzer wählt einen bestehenden Mitarbeiter aus.
2. Das System zeigt die Stammdaten des Mitarbeiters an.
3. Das System ermittelt alle Termine, denen der Mitarbeiter zugewiesen ist, über die Termin-Mitarbeiter-Relation.
4. Das System zeigt zu jedem Termin die relevanten Informationen an.
5. Das System stellt sicher, dass auch vergangene Termine angezeigt werden.

**Alternativabläufe**

- Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.

**Ergebnis**

Die Stammdaten des Mitarbeiters sowie eine vollständige Übersicht aller zugeordneten Termine sind sichtbar.

Die Terminliste bildet die Einsatzhistorie des Mitarbeiters ab.

**Angezeigte Informationen (Terminliste)**

- Terminzeitraum (Start- und ggf. Enddatum)
- Terminbezeichnung
- Zugeordnete Tour
- Zugeordneter Kunde

### **UC: Mitarbeiter deaktivieren**

**Akteur:** RO (01): Disponent 

**Ziel**

Einen Mitarbeiter aus dem aktiven Betrieb nehmen, ohne die Historie zu verlieren.

**Vorbedingungen**

- Der Mitarbeiter existiert und ist aktiv (is_active = TRUE).

**Ablauf**

1. Benutzer wählt einen Mitarbeiter aus.
2. Benutzer wählt die Funktion „Mitarbeiter deaktivieren".
3. Das System zeigt eine Bestätigung an.
4. Benutzer bestätigt die Deaktivierung.
5. Das System setzt is_active auf FALSE.
6. Das System speichert die Änderung.

**Alternativabläufe**

- Abbruch: Keine Änderung, Mitarbeiter bleibt aktiv.

**Ergebnis**

Der Mitarbeiter ist deaktiviert und erscheint nicht mehr in Auswahlisten für Terminzuweisungen, Tour-Zuordnungen oder Team-Zuordnungen.

Bestehende Terminbezüge, Tour- und Team-Zugehörigkeiten bleiben für historische Nachvollziehbarkeit erhalten.

Der Mitarbeiter ist weiterhin in der Mitarbeiterübersicht sichtbar und seine vollständige Terminhistorie bleibt einsehbar.

### **UC: Mitarbeiter reaktivieren**

**Akteur**

Disponent

**Ziel**

Einen deaktivierten Mitarbeiter wieder in den aktiven Betrieb aufnehmen.

**Vorbedingungen**

- Der Mitarbeiter existiert und ist deaktiviert (is_active = FALSE).

**Ablauf**

1. Benutzer wählt einen deaktivierten Mitarbeiter aus der Mitarbeiterübersicht.
2. Benutzer wählt die Funktion „Mitarbeiter reaktivieren".
3. Das System setzt is_active auf TRUE.
4. Das System speichert die Änderung.

**Ergebnis**

Der Mitarbeiter ist wieder aktiv und steht für alle Planungsfunktionen zur Verfügung.

### UC: Mitarbeiteranhänge verwalten

**Akteur:** RO (01): Disponent

**Ziel:**

Der Disponent kann Dokumente zu einem Mitarbeiter hinzufügen und bestehende Dokumente in der Mitarbeiterdetailansicht öffnen oder herunterladen.

**Vorbedingungen:**

Der Mitarbeiter existiert und die Mitarbeiterdetailansicht ist geöffnet.

**Ablauf:**

1. Der Disponent öffnet die Detailansicht eines Mitarbeiters.
2. Das System zeigt eine Liste der vorhandenen Anhänge des Mitarbeiters an.
3. Der Disponent fügt einen oder mehrere Anhänge hinzu (Upload).
4. Das System speichert die Dateien als mitarbeiterbezogene Anhänge und aktualisiert die Liste.
5. Der Disponent kann einen Anhang öffnen (Preview) oder herunterladen.

**Regeln & Randbedingungen:**

Eine Löschfunktion für Mitarbeiteranhänge wird nicht angeboten, weil es für Mitarbeiteranhänge keinen Delete-Endpunkt gibt und Löschung serverseitig nicht vorgesehen ist.

### UC: Mitarbeiter anzeigen

**Akteur:** Disponent

**Ziel:** Der Disponent sieht standardmäßig nur aktive Mitarbeiter und kann bei Bedarf alle Mitarbeiter anzeigen.

**Vorbedingungen:** Mitarbeiter sind im System vorhanden.

**Auslöser:** Der Disponent öffnet die Mitarbeiterübersicht.

**Ablauf:** Der Disponent öffnet die Mitarbeiterübersicht. Das System lädt standardmäßig nur aktive Mitarbeiter und zeigt sie an. Der Disponent kann die Option „Alle“ aktivieren; das System lädt dann aktive und inaktive Mitarbeiter und zeigt beide an. Der Disponent kann die Option wieder deaktivieren; das System lädt wieder nur aktive Mitarbeiter.

**Ergebnis:** Der Disponent sieht entweder nur aktive Mitarbeiter oder alle Mitarbeiter, ohne dass Daten gelöscht oder verborgen werden.

# FT (06): Druckfunktionen

## Ziel / Zweck

Dieses Feature ermöglicht die Ausgabe zentraler Planungs- und Übersichtsansichten als Papierdruck oder PDF. Die Druckfunktionen dienen der Unterstützung von Abstimmungen, Briefings und interner Kommunikation außerhalb des Systems.

## Fachliche Beschreibung

Die Druckfunktionen stellen verschiedene Sichten der Terminplanung und -übersicht in druckbarer Form bereit. Grundlage für alle Druckausgaben sind die im System verfügbaren Kalender- und Übersichtsansichten. Die Druckausgaben bilden diese Ansichten inhaltlich vollständig ab, sind jedoch in ihrer Darstellung für Papier oder PDF optimiert.

Unterstützt werden sowohl kalenderbasierte Ansichten (z. B. Planungs- und Auslastungsansichten) als auch tabellarische Übersichten (z. B. nächste Termine oder Mitarbeitertermine). Für jede Druckausgabe kann ein Zeitraum festgelegt werden. Je nach Drucktyp können zusätzlich Filter oder Darstellungsvarianten gewählt werden.

Kalenderdrucke übernehmen die visuelle Strukturierung der jeweiligen Ansicht, insbesondere Farben, Stapelung und Sortierung. Interaktive Elemente wie Tooltips werden nicht gedruckt; relevante Kurzinformationen werden stattdessen direkt in der Terminfläche oder in ergänzenden Spalten bzw. Legenden dargestellt.

Die Ausgabe erfolgt wahlweise als direkter Papierdruck oder als PDF-Export.

## Regeln & Randbedingungen

- Jede Druckausgabe basiert auf einer bestehenden Ansicht oder Übersicht.
- Für jede Druckausgabe kann ein Zeitraum gewählt werden.
- Team- und Mitarbeiterdrucke sind gefilterte Sichten.
- Kalenderdrucke übernehmen die bestehende visuelle Darstellung (Farben, Stapelung, Sortierung).
- Interaktive UI-Elemente (z. B. Tooltips) werden nicht gedruckt.
- Relevante Kurzinformationen werden statisch dargestellt (Terminfläche, Spalten, Legende).
- Die Druckfunktion verändert keine Daten und ist rein ausgabebezogen.

## **Use Cases**

### **UC: Druck: Planungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Kalender-Planungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Eine Planungsansicht ist geöffnet.

**Ablauf**

1. Benutzer wählt die Druckfunktion.
2. Benutzer wählt den Zeitraum.
3. Benutzer wählt die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.
5. Benutzer startet den Druck oder speichert die Ausgabe als PDF.

**Ergebnis**

Die gewählte Planungsansicht liegt als Druck oder PDF vor.

### **UC: Druck: Auslastungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Die Auslastungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Die Auslastungsansicht ist verfügbar.

**Ablauf**

1. Benutzer wählt die Auslastungsansicht.
2. Benutzer startet die Druckfunktion.
3. Benutzer wählt den Zeitraum und die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.

**Ergebnis**

Die Auslastungsansicht liegt als Druck oder PDF vor.

### **UC: Druck: Nächste Termine ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Übersicht der nächsten Termine als Druck oder PDF ausgeben.

**Vorbedingungen**

- Termine sind vorhanden.

**Ablauf**

1. Benutzer wählt die Funktion „Nächste Termine“.
2. Benutzer wählt den Zeitraum und ggf. Filter.
3. Benutzer startet die Druckfunktion.
4. System erzeugt die Ausgabe.

**Ergebnis**

Die Übersicht der nächsten Termine liegt als Druck oder PDF vor.

### **UC: Druck: Mitarbeitertermine ausgeben**

**Akteur**

Disponent

**Ziel**

Die Termine eines ausgewählten Mitarbeiters als Druck oder PDF ausgeben.

**Vorbedingungen**

- Der Mitarbeiter existiert.

**Ablauf**

1. Benutzer wählt einen Mitarbeiter.
2. Benutzer wählt die Darstellungsart (tabellarisch oder als Kalender).
3. Benutzer wählt den Zeitraum.
4. Benutzer startet die Druckfunktion.
5. System erzeugt die Ausgabe.

**Ergebnis**

Die Termine des Mitarbeiters liegen als Druck oder PDF vor.

# FT (07): Fallback-Kalender und Datei

## Ziel / Zweck

Dieses Feature stellt sicher, dass Planungsinformationen auch bei technischen Störungen, Teilausfällen oder eingeschränkter Systemverfügbarkeit zugänglich bleiben. Dazu werden Termine kontinuierlich in externe Kalender synchronisiert und zusätzlich als dateibasierter Fallback bereitgestellt.

## Fachliche Beschreibung

Zur Absicherung der Terminplanung werden externe Kalender und Dateiexporte als **read-only Fallbacks** genutzt. Pro Tour steht ein externer Kalender zur Verfügung (z. B. Google Calendar oder Nextcloud Calendar). Zusätzlich existiert ein zentraler Planungskalender. Diese Kalender spiegeln den aktuellen Stand der Terminplanung wider und dienen ausschließlich der Anzeige.

Die Synchronisation erfolgt automatisch und nahezu in Echtzeit, sobald Termine in der Anwendung angelegt, geändert oder gelöscht werden. Änderungen dürfen **nicht außerhalb der Anwendung** vorgenommen werden. Externe Kalender sind strikt lesend; Bearbeitungen dort sind nicht vorgesehen.

Ergänzend kann eine **Excel-Arbeitsmappe** als dateibasierter Fallback erzeugt werden. Diese stellt eine Momentaufnahme der Terminplanung dar und kann bei Ausfällen oder zur Weitergabe verwendet werden.

Der Zustand der Synchronisation wird überwacht. Fehler oder Verzögerungen werden sichtbar markiert, sodass organisatorische oder technische Maßnahmen eingeleitet werden können.

## Regeln & Randbedingungen

- Externe Kalender und Dateien sind **read-only**.
- Änderungen an Terminen erfolgen ausschließlich in der Anwendung.
- Synchronisation erfolgt automatisch und nahezu in Echtzeit.
- Pro Tour existiert genau ein externer Kalender.
- Zusätzlich existiert ein zentraler Planungskalender.
- Synchronisationsfehler werden sichtbar markiert.
- Datei-Exporte stellen **Momentaufnahmen** dar und sind nicht live gekoppelt.

## **Use Cases**

### **UC: Termine in externe Kalender synchronisieren**

**Akteur**

Disponent

**Ziel**

Termindaten automatisch in externe Kalender übertragen.

**Vorbedingungen**

- Externe Kalender sind verbunden.

**Ablauf**

1. Ein Termin wird in der Anwendung erstellt, geändert oder gelöscht.
2. Das System ermittelt die betroffenen Tourkalender sowie ggf. den zentralen Planungskalender.
3. Das System überträgt die Änderungen an die externen Kalender.
4. Das System protokolliert Erfolg oder Fehler der Synchronisation.

**Ergebnis**

Die externen Kalender entsprechen dem aktuellen Stand der Anwendung (nahezu in Echtzeit).

### **UC: Synchronisationsstatus überwachen**

**Akteur**

Disponent

**Ziel**

Erkennen, ob die Synchronisation zu externen Kalendern ordnungsgemäß funktioniert.

**Vorbedingungen**

- Externe Kalender sind verbunden.

**Ablauf**

1. Das System zeigt den Synchronisationsstatus pro Tourkalender sowie ggf. für den zentralen Planungskalender an.
2. Bei Fehlern markiert das System betroffene Termine oder Touren als „Synchronisation ausstehend“.
3. Der Benutzer kann Details einsehen (z. B. letzter erfolgreicher Abgleich, Fehlermeldungskategorie).

**Ergebnis**

Synchronisationsprobleme sind sichtbar und können organisatorisch oder technisch behoben werden.

### **UC: Excel-Fallback exportieren**

**Akteur**

Disponent

**Ziel**

Eine Excel-Arbeitsmappe mit detaillierten Termininformationen als dateibasierten Fallback erzeugen.

**Vorbedingungen**

- Termine sind vorhanden.

**Ablauf**

1. Der Benutzer wählt einen Zeitraum und ggf. Filter (Team, Mitarbeiter).
2. Der Benutzer startet den Export.
3. Das System erzeugt eine Excel-Arbeitsmappe mit den Termindaten.

**Ergebnis**

Die Excel-Datei steht als Fallback-Momentaufnahme zur Verfügung.

### **UC: Externe Kalender verbinden**

**Akteur**

Disponent

**Ziel**

Externe Kalender für Teams und den zentralen Planungskalender anbinden.

**Vorbedingungen**

- Externe Kalenderkonten oder Server sind verfügbar (z. B. Google oder Nextcloud).
- Teams existieren.

**Ablauf**

1. Der Benutzer hinterlegt die Verbindungsdaten (z. B. Konto, Server, Berechtigungen).
2. Der Benutzer weist jedem Team einen externen Kalender zu.
3. Der Benutzer legt den zentralen Planungskalender fest.
4. Das System prüft die Verbindung und speichert die Zuordnung.

**Ergebnis**

Teams und Planung verfügen über zugeordnete externe Kalender, die für die Synchronisation bereitstehen.

# FT (09): Kundenverwaltung

## Ziel / Zweck

Dieses Feature stellt die Verwaltung von Kundenstammdaten bereit, damit Termine nicht mehr mit frei erfassten Kundendaten arbeiten müssen. Termine referenzieren künftig ein Projekt und über dieses einen Kunden und übernehmen Adresse sowie Kontaktdaten daraus, um Konsistenz, Wiederverwendbarkeit und saubere Historien sicherzustellen. Einem Kunden können Notizen zugeordnet werden.

## Fachliche Beschreibung

Die Kundenverwaltung ermöglicht das Anlegen, Bearbeiten und Anzeigen von Kunden. Pro Kunde werden Stammdaten gespeichert, insbesondere **Name/Firma**, **Kundennummer**, **Adresse** und **Telefonnummer**.
Ein Kunde kann beliebig viele Projekte und damit indirekt beliebig viele Termine besitzen. In der Kundendetailansicht wird eine **Projektliste** angezeigt, die alle dem Kunden zugeordneten Projekte umfasst (z. B. Aufbau, Service, Nachbesserung).
Kunden dürfen nicht physisch gelöscht werden, sobald sie in Projekten verwendet werden. Stattdessen können sie **deaktiviert/archiviert** werden. Archivierte Kunden bleiben in bestehenden Projekten und in der Historie sichtbar, stehen jedoch **nicht mehr für neue Projekte** zur Auswahl.
Kunden haben eine **Notizenliste** (0..n). Notizen werden in der Kundendetailansicht als vertikale Kärtchenliste dargestellt und über einen Richtext-Editor verwaltet. Die Verwaltungslogik für Notizen ist in FT (13): Notizverwaltung definiert. Notizen sind **kundenbezogen** und **projektunabhängig**.

In der Kundendetailansicht können dem Kunden zusätzlich Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## Regeln & Randbedingungen

- Kundendaten (Name, Kundennummer, Adresse, Telefon) werden **zentral** am Kunden gepflegt.
- Kunden dürfen **nicht gelöscht** werden, wenn sie in Projekten verwendet werden.
- Jeder Kunde besitzt ein **is_active** Flag (Standardwert: TRUE).
- Deaktivierte/archivierte Kunden (is_active = FALSE):
    - bleiben in bestehenden Projekten sichtbar,
    - erscheinen in der Historie,
    - dürfen **nicht** mehr für neue Projekte ausgewählt werden.
- Pflichtfelder:
    - Kundenname bzw. Firma,
    - Telefonnummer,
    - Kundennummer (aus WAWI).
- Die Adresse ist Pflicht, sofern sie für Planung oder Druck benötigt wird.
- Notizen sind optional und werden über die Relationstabelle `customer_note` mit dem Kunden verknüpft.
- Ein Kunde kann 0..n Notizen haben.
- Notizen werden gemäß FT (13): Notizverwaltung verwaltet.
- Das Löschen eines Kunden löscht auch alle zugehörigen Notizen (CASCADE über customer_note).
- Kundenanhänge sind kundenbezogen und unabhängig von Projekten; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## **Use Cases**

### **UC: Kunde anlegen**

**Akteur:** RO (01): Disponent

**Ziel**

Einen neuen Kunden mit Adresse und Kontaktdaten im System anlegen.

**Vorbedingungen**

- Der Disponent ist angemeldet und berechtigt.

**Ablauf**

1. Der Disponent startet „Kunde anlegen“.
2. Das System zeigt ein Eingabeformular für Kundendaten an.
3. Der Disponent erfasst Name/Firma, Adresse und Telefonnummer und bestätigt.
4. Das System validiert Pflichtfelder und legt den Kunden an.
5. Das System zeigt die Kundendetailansicht an.

**Alternativabläufe**

- Pflichtfelder fehlen: Das System speichert nicht und fordert zur Korrektur auf.
- Dublettenhinweis: Das System warnt bei ähnlichen Namen/Adressen und lässt das Speichern nach Bestätigung zu oder verweigert es gemäß Regel.

**Ergebnis**

Ein neuer Kunde ist gespeichert und kann bei der Terminvergabe ausgewählt werden.

### **UC: Kunde bearbeiten**

**Akteur:** RO (01): Disponent

**Ziel**

Kundendaten (Adresse, Telefon, Kundennummer) aktualisieren.

**Vorbedingungen**

- Ein Kunde existiert.
- Der Disponent ist berechtigt.

**Ablauf**

1. Der Disponent öffnet einen Kunden.
2. Das System zeigt die Kundendaten, Projektliste und Notizenliste an.
3. Der Disponent startet „Bearbeiten", ändert Daten und bestätigt.
4. Das System validiert und speichert die Änderungen.
5. Das System zeigt die aktualisierte Kundendetailansicht.

**Alternativabläufe**

- Pflichtfelder ungültig: Das System speichert nicht und fordert zur Korrektur auf.
- Abbruch: Änderungen werden verworfen.

**Ergebnis**

Die Kundendaten sind aktualisiert; die Verknüpfungen zu Projekten bleiben erhalten.

### **UC: Kunde anzeigen (inkl. Terminliste)**

**Akteur:** RO (01): Disponent, RO (02): Leser 

**Ziel**

Kundendaten einsehen und die zugehörigen Projekte überblicken.

**Vorbedingungen**

- Der Kunde existiert.
- Der Nutzer besitzt Leserechte.

**Ablauf**

1. Der Nutzer wählt einen Kunden aus der Kundenliste.
2. Das System zeigt Stammdaten, eine Projektliste und eine Notizliste.
3. Der Nutzer kann ein Projekt aus der Liste öffnen (Anzeigen oder Bearbeiten gemäß Rolle).

**Alternativabläufe**

- Keine Projekte vorhanden: Das System zeigt eine leere Projektliste an.
- Keine Notizen vorhanden: Das System zeigt eine leere Notizliste an.

**Ergebnis**

Kundendaten, Projektübersicht und Notizen sind sichtbar.

### **UC: Kunde deaktivieren / archivieren**

**Akteur:** RO (03): Admin 

**Ziel**

Einen Kunden aus dem aktiven Bestand entfernen, ohne die Historie zu verlieren.

**Vorbedingungen**

- Ein Kunde existiert und ist aktiv (is_active = TRUE).
- Der Nutzer ist berechtigt.

**Ablauf**

1. Der Nutzer öffnet den Kunden.
2. Der Nutzer wählt „Deaktivieren/Archivieren".
3. Das System zeigt eine Bestätigung an.
4. Der Nutzer bestätigt.
5. Das System setzt is_active auf FALSE.
6. Das System speichert die Änderung.

**Alternativabläufe**

- Abbruch: Keine Änderung.

**Ergebnis**

Der Kunde ist deaktiviert (is_active = FALSE), bleibt aber historisch und in Projekten sichtbar.

Alle Projekte, Notizen und zugehörigen Daten bleiben vollständig erhalten.

### **UC: Kundennotizen verwalten**

**Akteur:** RO (01): Disponent 

**Ziel**

Kundenbezogene Notizen hinzufügen, bearbeiten, anzeigen oder löschen.

**Vorbedingungen**

Kunde existiert.

**Ablauf**

1. Disponent öffnet die Kundendetails.
2. System zeigt die Notizenliste als vertikale Kärtchenliste an.
3. Disponent führt gewünschte Notizaktionen aus (Hinzufügen, Bearbeiten, Löschen).
4. Detaillierte Abläufe siehe FT (13): Notizverwaltung.

**Ergebnis**

Notizen sind dem Kunden zugeordnet und in der Kundendetailansicht sichtbar.

**Hinweis**

Die fachliche Logik für Notizoperationen ist in FT (13): Notizverwaltung definiert.

### **UC: Kunde reaktivieren**

**Akteur:** RO (03): Admin 

**Ziel**

Einen deaktivierten Kunden wieder in die aktive Nutzung aufnehmen.

**Vorbedingungen**

- Ein Kunde existiert und ist deaktiviert (is_active = FALSE).
- Der Nutzer ist berechtigt.

**Ablauf**

1. Der Nutzer öffnet einen deaktivierten Kunden (z.B. über Suche oder historische Ansicht).
2. Der Nutzer wählt „Kunde reaktivieren".
3. Das System setzt is_active auf TRUE.
4. Das System speichert die Änderung.

**Ergebnis**

Der Kunde ist wieder aktiv und steht für neue Projekte zur Verfügung.

### UC: Kundenanhänge verwalten

**Akteur:** RO (01): Disponent

**Ziel:**

Der Disponent kann Dokumente zu einem Kunden hinzufügen und bestehende Dokumente in der Kundendetailansicht öffnen oder herunterladen.

**Vorbedingungen:**

Der Kunde existiert und die Kundendetailansicht ist geöffnet.

**Ablauf:**

1. Der Disponent öffnet die Detailansicht eines Kunden.
2. Das System zeigt eine Liste der vorhandenen Anhänge des Kunden an.
3. Der Disponent fügt einen oder mehrere Anhänge hinzu (Upload).
4. Das System speichert die Dateien als kundenbezogene Anhänge und aktualisiert die Liste.
5. Der Disponent kann einen Anhang öffnen (Preview) oder herunterladen.

**Regeln & Randbedingungen:**

Eine Löschfunktion für Kundenanhänge wird nicht angeboten, weil es für Kundenanhänge keinen Delete-Endpunkt gibt und Löschung serverseitig nicht vorgesehen ist.

# FT (11): Team Verwaltung

## Ziel / Zweck

Teams ermöglichen der Disposition, häufig verwendete Mitarbeiterkombinationen schnell und konsistent auf Termine anzuwenden. Ziel ist es, die Mitarbeiterzuweisung zu beschleunigen, ohne die Terminplanung fachlich zu verändern oder zu verkomplizieren.

## Fachliche Beschreibung

Teams sind **reine Dispositionshilfen**. Ein Team besteht aus einer Bezeichnung und einer Liste aktiver Mitarbeiter. Sie kann beim Anlegen oder Bearbeiten eines Termins ausgewählt werden; das System übernimmt dann die enthaltenen Mitarbeiter **als Vorschlag** in die Mitarbeiterzuweisung des Termins.

Am Termin selbst wird **immer die konkrete Mitarbeiterliste** gespeichert, nicht das Team. Änderungen an Teams wirken sich **nicht rückwirkend** auf bestehende oder vergangene Termine aus. Teams besitzen **keine Historie** und haben **keine fachliche Bedeutung** über die Vereinfachung der Eingabe hinaus.

Teams können unabhängig von Terminen existieren. Sie dürfen ausschließlich **aktive Mitarbeiter** enthalten. Beim Anwenden eines Teams ist eindeutig festzulegen, ob die Mitarbeiter **ersetzt** oder **hinzugefügt** werden; die Entscheidung ist systemweit konsistent umzusetzen.

## Regeln & Randbedingungen

- Teams sind **nicht** direkt mit Terminen verknüpft.
- Gespeichert wird am Termin stets die **konkrete Mitarbeiterzuweisung**.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Teams enthalten **nur aktive Mitarbeiter**.
- Ein Termin kann mehrere Mitarbeiter haben; die Mitarbeiterzuweisung ist optional.
- Teams besitzen **keine Historie** und **keinen Status**.
- Teams können ohne Bezug zu Terminen existieren.

## **Use Cases**

### **UC: Team anlegen**

**Akteur**

Disponent

**Ziel**

Ein neues Team anlegen, um häufig genutzte Mitarbeiterkombinationen schnell verwenden zu können.

**Vorbedingungen**

- Es existieren aktive Mitarbeiter.
- Der Disponent ist berechtigt.

**Auslöser**

Der Disponent startet die Funktion „Team anlegen".

**Ablauf**

1. Der Name des Teams wird automatisch generiert.
2. Der Disponent wählt einen oder mehrere aktive Mitarbeiter aus.
3. Der Disponent bestätigt die Eingabe.
4. Das System speichert das Team.

**Alternativabläufe**

- Keine Mitarbeiter ausgewählt: Das System speichert nicht und fordert zur Auswahl auf.
- Abbruch: Das System verwirft die Eingaben.

**Ergebnis**

Ein neues Team ist gespeichert und steht zur späteren Verwendung zur Verfügung.

### **UC: Team bearbeiten**

**Akteur:** RO (01): Disponent

**Ziel**

Ein bestehendes Team anpassen, z. B. Mitarbeiter hinzufügen oder entfernen.

**Vorbedingungen**

- Das Team existiert.
- Der Disponent ist berechtigt.

**Auslöser**

Der Disponent wählt ein bestehendes Team zur Bearbeitung aus.

**Ablauf**

1. Der Disponent öffnet ein Team.
2. Das System zeigt Bezeichnung und zugeordnete Mitarbeiter an.
3. Der Disponent ändert Bezeichnung und/oder Mitarbeiterliste.
4. Der Disponent bestätigt die Änderungen.
5. Das System speichert das aktualisierte Team.

**Alternativabläufe**

- Abbruch: Das System verwirft die Änderungen.
- Ungültige Auswahl (z. B. kein Mitarbeiter): Das System speichert nicht.

**Ergebnis**

Das Team ist aktualisiert und steht in der neuen Zusammensetzung zur Verfügung.

### **UC: Team löschen**

**Akteur**

Disponent

**Ziel**

Ein nicht mehr benötigtes Team entfernen.

**Vorbedingungen**

- Das Team existiert.
- Der Disponent ist berechtigt.

**Auslöser**

Der Disponent wählt ein Team zum Löschen aus.

**Ablauf**

1. Der Disponent startet „Team löschen".
2. Das System fordert eine Bestätigung an.
3. Der Disponent bestätigt den Löschvorgang.
4. Das System löscht das Team.

**Alternativabläufe**

- Abbruch: Das Team bleibt unverändert bestehen.

**Ergebnis**

Das Team ist gelöscht und nicht mehr auswählbar.

### **UC: Team anzeigen**

**Akteur**

Disponent (Leser)

**Ziel**

Eine Übersicht über vorhandene Teams und deren Zusammensetzung erhalten.

**Vorbedingungen**

- Mindestens ein Team existiert.
- Der Nutzer ist berechtigt.

**Auslöser**

Der Nutzer wählt ein Team zur Anzeige aus.

**Ablauf**

1. Der Nutzer wählt ein Team.
2. Das System zeigt Bezeichnung und zugeordnete Mitarbeiter an.

**Alternativabläufe**

- Keine Teams vorhanden: Das System zeigt eine entsprechende Information an.

**Ergebnis**

Die Zusammensetzung des Teams ist sichtbar.

# FT (12): Dispositionsübersicht

## Ziel / Zweck

Dieses Feature unterstützt die Disposition durch eine übersichtliche, wochenbezogene Darstellung von Mitarbeiter- und Tourzuordnungen. Ziel ist es, Einsatzverteilungen transparent zu machen und Planungsentscheidungen zu erleichtern, ohne in bestehende Termin- oder Ressourcendaten einzugreifen.

## Fachliche Beschreibung

Die Dispositionsübersicht stellt aus bestehenden Termindaten abgeleitete Wochenübersichten bereit. Sie zeigt, **welcher Mitarbeiter in welchen Kalenderwochen auf welchen Touren eingesetzt ist** und umgekehrt, **welche Mitarbeiter innerhalb einer Kalenderwoche auf einer bestimmten Tour eingeplant sind**.

Die Übersichten basieren ausschließlich auf vorhandenen Termin-, Mitarbeiter- und Tourzuordnungen. Es findet keine Bewertung, Priorisierung oder automatische Korrektur statt. Die Darstellung dient der Orientierung und Ergänzung der Terminplanung, insbesondere zur Erkennung von Mehrfachzuordnungen oder häufigen Tourwechseln innerhalb einer Woche.

Die Dispositionsübersicht berücksichtigt aktuelle und zukünftige Termine. Vergangene Termine können optional angezeigt werden, sind jedoch rein informativ und nicht veränderbar.

## Regeln & Randbedingungen

- Die Übersichten werden ausschließlich aus bestehenden Terminen abgeleitet.
- Es werden nur Termine berücksichtigt, denen mindestens ein Mitarbeiter zugewiesen ist.
- Die Darstellung erfolgt kalenderwochenbezogen.
- Ein Mitarbeiter kann innerhalb einer Kalenderwoche nur einer Tour zugeordnet sein
- Soll ein Mitarbeiter innerhalb einer Woche an Terminen verschieder Touren teilnehmen, kann dies über die direkte Mitarbeiter - Termizuweisung realisiert werden
- Tourwechsel innerhalb einer Woche sind nicht möglich
- Die Übersicht trifft keine fachliche Bewertung und löst keine Warnungen aus.
- Die Anzeige ist rein informativ und verändert keine Termine, Mitarbeiter oder Touren.

## **Use Cases**

### **UC: Mitarbeiterbezogene Wochenübersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, auf welchen Touren ein Mitarbeiter innerhalb einzelner Kalenderwochen eingesetzt ist.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Übersicht der Einsätze eines Mitarbeiters bereit. Die Übersicht wird aus bestehenden Terminen abgeleitet und zeigt die Tourzuordnung pro Kalenderwoche.

**Vorbedingungen**

- Es existieren Termine mit Mitarbeiter- und Tourzuordnung.
- Der Disponent ist berechtigt, Dispositionsübersichten einzusehen.

**Auslöser**

Der Disponent ruft die Dispositionsübersicht für einen Mitarbeiter auf.

**Ablauf**

1. Der Disponent wählt einen Mitarbeiter aus.
2. Das System ermittelt alle Termine, denen der Mitarbeiter zugewiesen ist.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugehörigen Touren je Woche ab.
5. Das System stellt die Wochenübersicht des Mitarbeiters dar.

**Alternativabläufe**

- Dem Mitarbeiter sind keine Termine zugeordnet: Das System zeigt eine leere Übersicht an.

**Ergebnis**

Der Disponent erhält eine Übersicht, aus der ersichtlich ist, auf welchen Touren der Mitarbeiter in den einzelnen Kalenderwochen eingesetzt ist.

**Ausgegebene Informationen**

- Kalenderwoche
- Mitarbeiter
- Zugeordnete Tour(en)

**Regeln & Randbedingungen**

- Die Übersicht ist informativ und nicht blockierend.
- Die Anzeige verändert keine fachlichen Daten.

### **UC: Tourbezogene Wochenübersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, welche Mitarbeiter innerhalb einzelner Kalenderwochen auf einer bestimmten Tour eingesetzt sind.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Übersicht einer Tour bereit. Die Übersicht zeigt, welche Mitarbeiter in einer Kalenderwoche Terminen dieser Tour zugeordnet sind.

**Vorbedingungen**

- Es existieren Termine mit Tour- und Mitarbeiterzuordnung.
- Der Disponent ist berechtigt, Dispositionsübersichten einzusehen.

**Auslöser**

Der Disponent ruft die Dispositionsübersicht für eine Tour auf.

**Ablauf**

1. Der Disponent wählt eine Tour aus.
2. Das System ermittelt alle Termine, die dieser Tour zugeordnet sind.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugeordneten Mitarbeiter je Woche ab.
5. Das System stellt die Wochenübersicht der Tour dar.

**Alternativabläufe**

- Der Tour sind keine Termine zugeordnet: Das System zeigt eine leere Übersicht an.

**Ergebnis**

Der Disponent erhält eine Übersicht, aus der ersichtlich ist, welche Mitarbeiter in den einzelnen Kalenderwochen auf der ausgewählten Tour eingesetzt sind.

**Ausgegebene Informationen**

- Kalenderwoche
- Tour
- Zugeordnete Mitarbeiter

**Regeln & Randbedingungen**

- Ein Mitarbeiter kann innerhalb einer Woche mehrfach oder auf mehreren Touren erscheinen.
- Die Übersicht trifft keine fachliche Bewertung.
- Die Anzeige verändert keine Termine, Mitarbeiter oder Touren.

# FT (13): Notizverwaltung

## Ziel / Zweck

Dieses Feature ermöglicht die Verwaltung von Notizen als eigenständige Domainobjekte, die sowohl Projekten als auch Kunden zugeordnet werden können. Notizen dienen der Dokumentation zusätzlicher Informationen, Hinweise oder Besonderheiten, die im Kontext eines Projekts oder Kunden relevant sind.

Zusätzlich bietet das Feature vordefinierte Notizvorlagen als Eingabehilfe sowie die Möglichkeit, wichtige Notizen anzupinnen, damit diese stets oben in der Notizliste erscheinen.

## Fachliche Beschreibung

Notizen sind eigenständige Textobjekte mit Titel, formatierbarer Beschreibung und Zeitstempeln für Erstellung und letzte Bearbeitung. Sie werden über Relationstabellen entweder Projekten oder Kunden zugeordnet und ermöglichen eine flexible Dokumentation ohne strukturelle Abhängigkeiten.

Eine Notiz gehört immer genau einem Parent-Objekt (Projekt oder Kunde). Eine Notiz existiert nie unabhängig – sie wird immer im Kontext ihres Parents erstellt, verwaltet und gelöscht.

Notizen werden in den Detailansichten von Projekt und Kunde als vertikale Kärtchenliste dargestellt. Die Bearbeitung erfolgt über einen schwebenden Richtext-Editor, der Textformatierung sowie Text- und Hintergrundfarben unterstützt.

**Angepinnte Notizen** werden in der Liste immer zuerst angezeigt, unabhängig von Erstellungs- oder Änderungsdatum. Innerhalb der gepinnten und nicht-gepinnten Gruppen erfolgt die Sortierung nach Änderungsdatum (neueste zuerst).

**Notizvorlagen** sind vordefinierte Textbausteine, die beim Erstellen einer neuen Notiz als Ausgangspunkt gewählt werden können. Vorlagen werden zentral in den Stammdaten verwaltet und stehen bei der Notizerstellung als Auswahlliste zur Verfügung. Die Vorlage wird beim Erstellen in die neue Notiz kopiert – danach besteht keine Verbindung mehr zwischen Vorlage und Notiz.

Notizen haben keine fachliche Wirkung auf Termine, Status oder Planungslogik. Sie dienen ausschließlich der Information und Dokumentation. Das Löschen einer Notiz erfolgt direkt über die Detailansicht des zugehörigen Parents und ist endgültig.

**Neu: Kennzeichnungsfarbe für Notizvorlagen (optional, Admin-only).** Notizvorlagen können optional eine zusätzliche Eigenschaft `color` besitzen, die eine fachliche Kennzeichnung darstellt und nicht mit Text- oder Hintergrundfarben innerhalb des Richtext-Inhalts zu verwechseln ist. Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden. Wird anschließend eine Notiz aus dieser Vorlage erzeugt, wird diese `color` beim Erstellen auf die neue Notiz übertragen. Daraus folgt, dass `color` als administrativ gepflegte Eigenschaft zu behandeln ist, die nur durch Administratoren gesetzt oder geändert werden darf.

## Regeln & Randbedingungen

**Allgemeine Regeln für Notizen**

- Eine Notiz ist ein eigenständiges Domainobjekt mit eigener ID.
- Eine Notiz gehört immer genau einem Parent-Objekt (Projekt oder Kunde).
- Eine Notiz kann nie ohne Parent-Zuordnung existieren.
- Pflichtfelder einer Notiz:
    - Titel (Text)
    - Beschreibung (formatierter Text)
- Automatisch gepflegte Felder:
    - created_at (Erstellungszeitpunkt)
    - updated_at (letzter Bearbeitungszeitpunkt)
- Eine Notiz wird über Relationstabellen verknüpft mit:
    - genau 1 Projekt (über `project_note`) ODER
    - genau 1 Kunde (über `customer_note`)
- Das Löschen einer Notiz ist endgültig und entfernt automatisch die zugehörige Relation (CASCADE).
- Das Löschen eines Projekts oder Kunden entfernt automatisch alle zugehörigen Notizen und deren Relationen (CASCADE).
- Notizen werden ausschließlich in den Detailansichten von Projekt oder Kunde verwaltet.
- Es gibt keine separate Notizverwaltung in der Navigation.
- Notizen haben keine Versionierung oder Historie.
- Notizen sind rein informativ und haben keine Auswirkung auf Terminplanung oder Geschäftslogik.

**Regeln für angepinnte Notizen**

- Eine Notiz kann über das Feld `is_pinned` als angepinnt markiert werden.
- Angepinnte Notizen erscheinen in der Notizliste immer vor nicht-angepinnten Notizen.
- Innerhalb der gepinnten Gruppe erfolgt die Sortierung nach `updated_at` absteigend.
- Innerhalb der nicht-gepinnten Gruppe erfolgt die Sortierung ebenfalls nach `updated_at` absteigend.
- Das Pinning kann jederzeit aktiviert oder deaktiviert werden.

**Regeln für Notizvorlagen**

- Notizvorlagen sind eigenständige Stammdatenobjekte mit Titel und vordefiniertem Inhalt.
- Vorlagen existieren unabhängig von Projekten und Kunden.
- Vorlagen werden in einem eigenen Stammdatenbereich verwaltet (z.B. unter Einstellungen oder Stammdaten).
- Beim Erstellen einer Notiz kann optional eine Vorlage ausgewählt werden.
- Bei Auswahl einer Vorlage werden Titel und Beschreibung in den Editor kopiert.
- Nach dem Kopieren besteht keine Verbindung zwischen Vorlage und erstellter Notiz.
- Änderungen an einer Vorlage wirken sich nicht auf bereits erstellte Notizen aus.
- Vorlagen können eine Sortierreihenfolge haben, um die Anzeige in der Auswahlliste zu steuern.
- Vorlagen können deaktiviert werden, ohne sie zu löschen.
- 

**Neu: Regeln zur Kennzeichnungsfarbe (`color`)**

- Notizvorlagen können optional eine Kennzeichnungsfarbe `color` besitzen.
- `color` ist eine Admin-only Eigenschaft und darf nur von Administratoren gesetzt oder geändert werden.
- Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden.
- Wird eine Notiz aus einer Vorlage erstellt, wird `color` beim Erstellen der Notiz in die Notiz übernommen, sofern die Vorlage eine `color` besitzt.
- Die Übernahme der `color` ist einmalig beim Erstellen; spätere Änderungen an der Vorlagen-`color` verändern bereits erstellte Notizen nicht automatisch.
- `color` ist fachliche Kennzeichnung und unabhängig von Richtext-Formatierungen (Text-/Hintergrundfarben) im Feld `body`.

## **Use Cases**

### **UC: Notiz zu Projekt hinzufügen**

**Akteur**

Disponent

**Ziel**

Eine neue Notiz erstellen und einem Projekt zuordnen.

**Vorbedingungen**

- Das Projekt existiert.
- Der Disponent ist angemeldet und berechtigt.

**Ablauf**

1. Benutzer öffnet die Projektdetails.
2. Benutzer wählt „Notiz hinzufügen".
3. Das System öffnet den Richtext-Editor.
4. Optional: Das System zeigt eine Auswahlliste verfügbarer Vorlagen an.
5. Optional: Benutzer wählt eine Vorlage – Titel und Beschreibung werden in den Editor übernommen.
6. Optional (NEU): Wenn die gewählte Vorlage eine Kennzeichnungsfarbe (`color`) besitzt, übernimmt das System diese Kennzeichnungsfarbe für die neue Notiz.
7. Benutzer erfasst Titel und Beschreibung.
8. Benutzer bestätigt die Eingabe.
9. Das System erstellt die Notiz und verknüpft sie mit dem Projekt.
10. Das System zeigt die Notiz in der Notizenliste des Projekts an.

**Alternativabläufe**

- Pflichtfelder fehlen: Das System fordert zur Korrektur auf.
- Abbruch: Notiz wird nicht erstellt.

**Ergebnis**

Die Notiz ist erstellt und dem Projekt zugeordnet.

### **UC: Notiz zu Kunde hinzufügen**

**Akteur**

Disponent

**Ziel**

Eine neue Notiz erstellen und einem Kunden zuordnen.

**Vorbedingungen**

- Der Kunde existiert.
- Der Disponent ist angemeldet und berechtigt.

**Ablauf**

1. Benutzer öffnet die Kundendetails.
2. Benutzer wählt „Notiz hinzufügen".
3. Das System öffnet den Richtext-Editor.
4. Optional: Das System zeigt eine Auswahlliste verfügbarer Vorlagen an.
5. Optional: Benutzer wählt eine Vorlage – Titel und Beschreibung werden in den Editor übernommen.
6. Optional (NEU): Wenn die gewählte Vorlage eine Kennzeichnungsfarbe (`color`) besitzt, übernimmt das System diese Kennzeichnungsfarbe für die neue Notiz.
7. Benutzer erfasst Titel und Beschreibung.
8. Benutzer bestätigt die Eingabe.
9. Das System erstellt die Notiz und verknüpft sie mit dem Kunden.
10. Das System zeigt die Notiz in der Notizenliste des Kunden an.

**Alternativabläufe**

- Pflichtfelder fehlen: Das System fordert zur Korrektur auf.
- Abbruch: Notiz wird nicht erstellt.

**Ergebnis**

Die Notiz ist erstellt und dem Kunden zugeordnet.

### **UC: Notiz bearbeiten**

**Akteur**

Disponent

**Ziel**

Eine bestehende Notiz ändern.

**Vorbedingungen**

- Die Notiz existiert.
- Der Disponent ist berechtigt.

**Ablauf**

1. Benutzer wählt eine Notiz aus der Notizenliste (Projekt oder Kunde).
2. Das System öffnet den Richtext-Editor mit den aktuellen Inhalten.
3. Benutzer ändert Titel, Beschreibung oder Farben.
4. Benutzer bestätigt die Änderungen.
5. Das System aktualisiert die Notiz.
6. Das System setzt updated_at auf den aktuellen Zeitstempel.
7. Das System zeigt die aktualisierte Notiz an.

**Alternativabläufe**

- Pflichtfelder ungültig: Das System fordert zur Korrektur auf.
- Abbruch: Änderungen werden verworfen.

**Ergebnis**

Die Notiz ist aktualisiert und in allen zugeordneten Kontexten (Projekt/Kunde) sichtbar.

**Hinweis (NEU):** Die hier genannten „Farben“ beziehen sich auf die Richtext-Formatierung im Feld `body` (Text-/Hintergrundfarben). Die Kennzeichnungsfarbe `color`, die aus einer Vorlage übernommen werden kann, ist davon unabhängig und wird nicht durch normale Disponenten-Bearbeitung an der Notizvorlage gesteuert.

### **UC: Notiz löschen**

**Akteur**

Disponent

**Ziel**

Eine Notiz vollständig entfernen.

**Vorbedingungen**

- Die Notiz existiert.
- Der Disponent ist berechtigt.

**Ablauf**

1. Benutzer wählt eine Notiz aus der Notizenliste.
2. Benutzer wählt „Notiz löschen".
3. Das System zeigt eine Sicherheitsabfrage an.
4. Benutzer bestätigt das Löschen.
5. Das System löscht die Notiz und die zugehörige Relation endgültig
6. Das Löschen erfolgt immer aus dem Parent-Kontext heraus
7. Das System entfernt die Notiz aus allen Notizenlisten.

**Alternativabläufe**

- Abbruch: Notiz bleibt erhalten.

**Ergebnis**

Die Notiz ist vollständig gelöscht und erscheint in keiner Ansicht mehr.

### **UC: Notizen eines Projekts anzeigen**

**Akteur**

Disponent, Leser

**Ziel**

Alle einem Projekt zugeordneten Notizen einsehen.

**Vorbedingungen**

- Das Projekt existiert.
- Der Nutzer besitzt Leserechte.

**Ablauf**

1. Benutzer öffnet die Projektdetails.
2. Das System zeigt alle verknüpften Notizen als vertikale Kärtchenliste an.
3. Angepinnte Notizen erscheinen zuerst, gekennzeichnet durch ein Pin-Symbol.
4. Jede Notiz wird mit Titel, Beschreibung und Farben dargestellt.
5. Neu (NEU): Wenn eine Notiz eine Kennzeichnungsfarbe (`color`) besitzt, kann diese zusätzlich als visueller Marker an der Notizkarte dargestellt werden.

**Alternativabläufe**

- Keine Notizen vorhanden: Das System zeigt eine leere Liste an.

**Ergebnis**

Alle Notizen des Projekts sind sichtbar.

### **UC: Notizen eines Kunden anzeigen**

**Akteur**

Disponent, Leser

**Ziel**

Alle einem Kunden zugeordneten Notizen einsehen.

**Vorbedingungen**

- Der Kunde existiert.
- Der Nutzer besitzt Leserechte.

**Ablauf**

1. Benutzer öffnet die Kundendetails.
2. Das System zeigt alle verknüpften Notizen als vertikale Kärtchenliste an.
3. Angepinnte Notizen erscheinen zuerst, gekennzeichnet durch ein Pin-Symbol.
4. Jede Notiz wird mit Titel, Beschreibung und Farben dargestellt.
5. Neu (NEU): Wenn eine Notiz eine Kennzeichnungsfarbe (`color`) besitzt, kann diese zusätzlich als visueller Marker an der Notizkarte dargestellt werden.

**Alternativabläufe**

- Keine Notizen vorhanden: Das System zeigt eine leere Liste an.

**Ergebnis**

Alle Notizen des Kunden sind sichtbar.

### **UC: Notiz anpinnen / Pinning aufheben**

**Akteur:** Disponent

**Ziel:** Eine Notiz dauerhaft oben in der Liste positionieren oder diese Positionierung aufheben.

**Vorbedingungen:**

- Die Notiz existiert.
- Der Disponent ist berechtigt.

**Ablauf:**

1. Benutzer wählt eine Notiz aus der Notizenliste.
2. Benutzer wählt „Anpinnen" (bzw. „Pinning aufheben" wenn bereits gepinnt).
3. Das System setzt das Feld `is_pinned` auf TRUE (bzw. FALSE).
4. Das System aktualisiert die Sortierung der Notizliste.
5. Angepinnte Notizen erscheinen nun oben in der Liste.

**Alternativabläufe:** Keine.

**Ergebnis:** Die Notiz ist angepinnt (oder nicht mehr angepinnt) und die Liste zeigt die neue Sortierung.

### **UC: Notizvorlage erstellen**

**Akteur:** Administrator, Disponent (je nach Rollenkonzept)

**Ziel:** Eine neue Notizvorlage anlegen.

**Vorbedingungen:**

- Der Benutzer hat Zugriff auf die Stammdatenverwaltung.

**Ablauf:**

1. Benutzer öffnet die Vorlagenverwaltung (z.B. unter Stammdaten oder Einstellungen).
2. Benutzer wählt „Vorlage hinzufügen".
3. Das System öffnet den Editor.
4. Benutzer erfasst Titel und vordefinierten Inhalt.
5. Optional: Benutzer legt Sortierreihenfolge fest.
6. Optional (NEU): Administrator legt eine Kennzeichnungsfarbe (`color`) fest, sofern eine Fahrzuweisung bzw. eine farbliche Kennzeichnung vorgesehen ist.
7. Benutzer bestätigt die Eingabe.
8. Das System erstellt die Vorlage.

**Alternativabläufe:**

- Pflichtfelder fehlen: Das System fordert zur Korrektur auf.
- Abbruch: Vorlage wird nicht erstellt.

**Ergebnis:** Die Vorlage ist erstellt und steht bei der Notizerstellung zur Auswahl.

### **UC: Notizvorlage bearbeiten**

**Akteur:** Administrator, Disponent (je nach Rollenkonzept)

**Ziel:** Eine bestehende Notizvorlage ändern.

**Vorbedingungen:**

- Die Vorlage existiert.
- Der Benutzer hat Zugriff auf die Stammdatenverwaltung.

**Ablauf:**

1. Benutzer öffnet die Vorlagenverwaltung.
2. Benutzer wählt eine Vorlage aus.
3. Das System öffnet den Editor mit den aktuellen Inhalten.
4. Benutzer ändert Titel, Inhalt oder Sortierreihenfolge.
5. Optional (NEU): Administrator ändert die Kennzeichnungsfarbe (`color`), sofern erforderlich.
6. Benutzer bestätigt die Änderungen.
7. Das System aktualisiert die Vorlage.

**Alternativabläufe:**

- Pflichtfelder ungültig: Das System fordert zur Korrektur auf.
- Abbruch: Änderungen werden verworfen.

**Ergebnis:** Die Vorlage ist aktualisiert. Bereits erstellte Notizen bleiben unverändert.

### **UC: Notizvorlage deaktivieren/aktivieren**

**Akteur:** Administrator, Disponent (je nach Rollenkonzept)

**Ziel:** Eine Vorlage aus der Auswahlliste entfernen, ohne sie zu löschen.

**Vorbedingungen:**

- Die Vorlage existiert.

**Ablauf:**

1. Benutzer öffnet die Vorlagenverwaltung.
2. Benutzer wählt eine Vorlage aus.
3. Benutzer wählt „Deaktivieren" (bzw. „Aktivieren").
4. Das System setzt das Feld `is_active` entsprechend.

**Ergebnis:** Deaktivierte Vorlagen erscheinen nicht mehr in der Auswahlliste bei der Notizerstellung, bleiben aber im System erhalten.

### **UC: Notizvorlage löschen**

**Akteur:** Administrator

**Ziel:** Eine Vorlage vollständig entfernen.

**Vorbedingungen:**

- Die Vorlage existiert.

**Ablauf:**

1. Benutzer öffnet die Vorlagenverwaltung.
2. Benutzer wählt eine Vorlage aus.
3. Benutzer wählt „Vorlage löschen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Benutzer bestätigt das Löschen.
6. Das System löscht die Vorlage endgültig.

**Alternativabläufe:**

- Abbruch: Vorlage bleibt erhalten.

**Ergebnis:** Die Vorlage ist gelöscht. Bereits erstellte Notizen bleiben unverändert.

# FT (14): Benutzer- und Rollenverwaltung

## Ziel / Zweck

Dieses Feature definiert die Benutzerrollen und deren Berechtigungen im System. Ziel ist eine klare, nachvollziehbare und technisch durchsetzbare Trennung von Leserechten, operativen Bearbeitungsrechten und administrativen Systemrechten. Die Rollen wirken systemweit und bilden die Grundlage für sichere UI- und Backend-Logik.

## Fachliche Beschreibung

Das System arbeitet rollenbasiert. Jeder Benutzer besitzt genau eine Rolle. Die Rolle bestimmt, welche Inhalte sichtbar sind und welche Aktionen erlaubt sind. Die Durchsetzung der Berechtigungen erfolgt sowohl in der Benutzeroberfläche (Sichtbarkeit und Bedienbarkeit) als auch serverseitig zur Absicherung gegen manipulierte Requests.

Es existieren drei Rollen:

- Leser
- Disponent
- Admin

Die Rollen beziehen sich auf alle fachlichen Objekte, insbesondere Kunden und Notizen, wie sie in FT (09) und FT (13) beschrieben sind. Bestimmte Felder und Aktionen (z. B. Archivierung von Kunden) sind bewusst ausschließlich administrativen Benutzern vorbehalten.

## Regeln und Randbedingungen

Ein Benutzer besitzt genau eine Rolle. Mehrfachrollen oder temporäre Rollen sind nicht vorgesehen.

Berechtigungen müssen serverseitig geprüft werden. UI-seitige Einschränkungen dienen ausschließlich der Benutzerführung und ersetzen keine serverseitige Prüfung.

Kunden dürfen von normalen Benutzern nicht gelöscht werden. Die Deaktivierung bzw. Archivierung eines Kunden ist eine Admin-Funktion. Für nicht berechtigte Rollen bleibt der Status sichtbar, aber nicht veränderbar.

Notizen existieren ausschließlich im Kontext eines übergeordneten Objekts (Kunde oder Projekt). Es gibt keine eigenständige Notizverwaltung. Schreib- und Löschrechte für Notizen sind rollenabhängig.

Leser dürfen keinerlei schreibende Aktionen durchführen. Disponenten dürfen fachlich arbeiten, aber keine systemkritischen Zustände verändern. Admins dürfen alle Aktionen durchführen.

## Use Cases

# FT (15): Projekt Status Verwaltung

## Ziel / Zweck

Dieses Feature beschreibt die Verwaltung von Projektstatus-Etiketten als administrative Stammdaten.

Projektstatus dienen der fachlichen Einordnung und Orientierung von Projekten über ihren gesamten Lebenszyklus hinweg. Sie ermöglichen es, einem Projekt mehrere Status parallel zuzuordnen, ohne die technische Planung oder Terminlogik direkt zu beeinflussen.

Ziel ist eine klar strukturierte, erweiterbare und historientaugliche Statusverwaltung, die unabhängig von der eigentlichen Projektbearbeitung gepflegt werden kann.

## **Fachliche Beschreibung**

Projektstatus sind fachliche Etiketten, die zusätzlich zum Aktiv-Status eines Projekts (is_active) verwendet werden. Ein Projekt kann keinen, einen oder mehrere Projektstatus gleichzeitig besitzen. Die Status haben keinen unmittelbaren Einfluss auf Termine oder Kalenderfunktionen, dienen jedoch der fachlichen Orientierung, Filterung, Auswertung und Kommunikation im Dispositionsprozess.

Projektstatus werden in einer eigenen Stammdatentabelle gepflegt und über eine n:m-Beziehung Projekten zugeordnet. Die Pflege der Statusliste erfolgt ausschließlich administrativ. Disponenten nutzen die Status im Rahmen der Projektbearbeitung, können diese jedoch nicht administrieren.

Bestimmte Status können als Default-Status definiert sein. Diese sind systemseitig geschützt und dürfen nicht gelöscht werden.

## **Regeln & Randbedingungen**

- Projektstatus sind zentrale Stammdaten und werden systemweit verwendet.
- Ein Projekt kann keinen, einen oder mehrere Projektstatus besitzen.
- Die Zuordnung von Projektstatus zu Projekten erfolgt über eine n:m-Beziehung.

- Projektstatus haben keine direkte technische Wirkung auf Termine oder Kalenderlogik.
- Projektstatus können aktiviert oder deaktiviert werden.
- Deaktivierte Status stehen für neue Zuordnungen nicht mehr zur Verfügung, bleiben jedoch aus Gründen der Historie erhalten.
- Default-Statuswerte sind geschützt und dürfen nicht gelöscht werden.
- Die Pflege der Projektstatus ist ausschließlich der Rolle **Admin** vorbehalten.
- Die Auswahl und Zuordnung von Projektstatus zu Projekten erfolgt im Rahmen der Projektverwaltung (FT 02).

## **Use Cases**

### **UC: Projektstatus anzeigen**

Akteur: RO (01) Disponent, RO (03) Admin

Ziel:

Übersicht über verfügbare Projektstatus erhalten.

Vorbedingungen:

- Mindestens ein Projektstatus existiert.

Ablauf:

1. Benutzer öffnet ein Projekt oder eine Statusauswahl.
2. System zeigt alle aktiven Projektstatus in definierter Sortierung an.

Ergebnis:

Projektstatus sind übersichtlich sichtbar und auswählbar.

### **UC: Projektstatus zu Projekt zuordnen**

Akteur: RO (01) Disponent

Ziel:

Einem Projekt einen oder mehrere Projektstatus zuweisen.

Vorbedingungen:

- Projekt existiert.
- Mindestens ein aktiver Projektstatus existiert.

Ablauf:

1. Disponent öffnet ein Projekt.
2. Disponent wählt einen oder mehrere Status aus der Statusliste.
3. System speichert die Zuordnung.

Ergebnis:

Das Projekt ist mit den ausgewählten Status-Etiketten versehen.

### **UC: Projektstatus entfernen**

Akteur: RO (01) Disponent

Ziel:

Einen Projektstatus von einem Projekt entfernen.

Vorbedingungen:

- Projekt existiert.
- Dem Projekt ist mindestens ein Status zugeordnet.

Ablauf:

1. Disponent öffnet ein Projekt.
2. Disponent entfernt einen Status aus der Statusliste.
3. System speichert die Änderung.

Ergebnis:

Der Status ist nicht mehr dem Projekt zugeordnet; andere Status bleiben erhalten.

### **UC: Projektstatus verwalten**

Akteur: RO (03) Admin

Ziel:

Projektstatus administrativ pflegen.

Vorbedingungen:

- Admin ist angemeldet.

Ablauf:

1. Admin öffnet die Projektstatusverwaltung.
2. Admin legt neue Status an oder bearbeitet bestehende.
3. Admin kann Status aktivieren oder deaktivieren.
4. Default-Status können nicht gelöscht werden.
5. System speichert die Änderungen.

Ergebnis:

Die aktualisierte Statusliste steht allen Projekten zur Verfügung.

# FT (16): Hilfetexte verwalten

## Ziel / Zweck

Dieses Feature ermöglicht die zentrale Verwaltung von Hilfetexten in der Anwendung, die von Benutzern kontextbezogen über Hilfe-Symbole in der UI abgerufen werden können. Ziel ist, fachliche Bedienhinweise konsistent, wartbar und rollenbasiert bereitzustellen, ohne dass Hilfetexte in einzelnen UI-Views dupliziert oder fest im Frontend verdrahtet werden müssen.

## Fachliche Beschreibung

Ein Hilfetext ist ein eigenständiges, administrierbares Objekt mit eindeutiger Kennung („help_key“), Titel und formatierbarem Inhalt (Markdown). Hilfetexte werden in der UI kontextbezogen über ein Hilfe-Symbol (z. B. „?“ oder „i“) angezeigt. Die UI übergibt beim Abruf den help_key, das System liefert den passenden Hilfetext zurück.

Hilfetexte sind rein informativ. Sie verändern keine fachlichen Daten (Kunden, Projekte, Termine, Touren etc.) und sind unabhängig von Termin- und Planungslogik. Sie dienen der besseren Bedienbarkeit, der Einarbeitung und der Reduzierung von Rückfragen.

Die Pflege der Hilfetexte erfolgt administrativ. Disponenten und Leser können Hilfetexte anzeigen, aber nicht verändern. Admins können Hilfetexte anlegen, bearbeiten, aktivieren/deaktivieren und verwalten.

## Regeln & Randbedingungen

Ein Hilfetext besitzt einen eindeutigen help_key und darf pro help_key nur einmal existieren.

Hilfetexte sind global gültig; die Kontextbindung erfolgt ausschließlich über den help_key, nicht über direkte Fremdschlüssel auf Domainobjekte.

Hilfetexte haben keine fachliche Wirkung und sind ausschließlich Anzeige-/Dokumentationsinhalte.

Hilfetexte können aktiviert/deaktiviert werden; deaktivierte Hilfetexte sind in der UI nicht abrufbar, bleiben aber aus Gründen der Nachvollziehbarkeit erhalten.

Die Verwaltung (CRUD) der Hilfetexte ist ausschließlich der Rolle Admin vorbehalten.

Die Anzeige der Hilfetexte ist für alle Rollen erlaubt, sofern der Text aktiv ist.

Der Inhalt wird als Markdown gespeichert; externe Ressourcen- oder Dateipfadabhängigkeiten aus dem Client sind nicht vorgesehen.

## **Use Cases**

### UC: Hilfetext anzeigen (kontextbezogen)

**Akteur:** RO (01) Disponent, RO (02) Leser, RO (03) Admin

**Ziel:**

Einen Hilfetext in der UI über ein Hilfe-Symbol abrufen und lesen.

**Vorbedingungen:**

- Der Hilfetext ist aktiv.
- Der help_key ist im UI-Kontext hinterlegt.

**Ablauf:**

- Der Benutzer klickt in der UI auf das Hilfe-Symbol am jeweiligen UI-Element.
- Die UI übergibt den help_key an das System.
- Das System liefert Titel und Inhalt des zugehörigen Hilfetextes zurück.
- Die UI zeigt den Hilfetext als Tooltip/Popover/Modal an.

**Alternativen:**

- Kein Hilfetext vorhanden oder deaktiviert: Die UI zeigt „Keine Hilfe verfügbar“ oder blendet das Symbol aus.

**Ergebnis:**

Der Benutzer sieht den passenden Hilfetext zum aktuellen Kontext.

### UC: Hilfetext anlegen

**Akteur:** RO (03) Admin

**Ziel:**

Einen neuen Hilfetext erstellen, um einen UI-Kontext erklärbar zu machen.

**Vorbedingungen:**

- Admin ist angemeldet und berechtigt.

**Ablauf:**

- Admin öffnet die Hilfetext-Verwaltung.
- Admin wählt „Hilfetext anlegen“.
- Admin erfasst help_key, Titel und Inhalt und setzt den Text aktiv.
- Das System validiert die Eindeutigkeit des help_key und speichert.

**Alternativen:**

- help_key existiert bereits: Das System blockiert und fordert zur Korrektur auf.

**Ergebnis:**

Der Hilfetext ist gespeichert und in der UI über den help_key abrufbar.

### UC: Hilfetext bearbeiten

**Akteur:** RO (03) Admin

**Ziel:**

Einen bestehenden Hilfetext inhaltlich aktualisieren.

**Vorbedingungen:**

- Hilfetext existiert.

**Ablauf:**

- Admin öffnet die Hilfetext-Verwaltung und wählt einen Hilfetext.
- Admin ändert Titel und/oder Inhalt.
- Admin speichert.
- Das System aktualisiert den Hilfetext.

**Alternativen:**

- Abbruch: Es wird nichts gespeichert.

**Ergebnis:**

Der Hilfetext ist aktualisiert und wird künftig in der UI in der neuen Version angezeigt.

### UC: Hilfetext aktivieren/deaktivieren

**Akteur:** RO (03) Admin

**Ziel:**

Einen Hilfetext temporär aus der UI entfernen, ohne ihn zu löschen.

**Vorbedingungen:**

- Hilfetext existiert.

**Ablauf:**

- Admin öffnet einen Hilfetext in der Verwaltung.
- Admin setzt aktiv/inaktiv.
- Das System speichert den Status.

**Alternativen:**

- Abbruch: Keine Änderung.

**Ergebnis:**

Der Hilfetext ist je nach Status in der UI abrufbar oder verborgen.

### UC: Hilfetexte durchsuchen und anzeigen

**Akteur:** RO (03) Admin

**Ziel:**

Hilfetexte effizient finden, um sie zu pflegen.

**Vorbedingungen:**

- Hilfetexte existieren.

**Ablauf:**

- Admin öffnet die Hilfetext-Verwaltung.
- Admin sucht nach help_key oder Titel.
- Das System zeigt Trefferliste und Details an.

**Alternativen:**

- Keine Treffer: Das System zeigt eine leere Liste an.

**Ergebnis:**

Admin kann Hilfetexte schnell auffinden und bearbeiten.

# FT (17): UI Komposition

## Ziel / Zweck

Dieses Feature definiert eine eigene, klar abgegrenzte Kompositionsschicht für UI-Bausteine und die dazugehörige Dokumentation. Das Ziel ist es, wiederkehrende Layout- und Strukturmuster als verbindliche Vorlagen zu etablieren, sodass neue Screens nicht jedes Mal „frei“ komponiert werden, sondern sich kontrolliert aus stabilen, getesteten Mustern zusammensetzen. Dadurch sinken Komplexität, UI-Drift und Duplikation, während Refactorings nachvollziehbar und risikoarm bleiben.

Dieses Feature ist bewusst kein Fachfeature, sondern eine technische und gestalterische Leitplanke. Es beschreibt, welche UI-Komponenten als „Kompositionsvorlagen“ gelten, wie sie verwendet werden, welche Slots und Zuständigkeiten sie besitzen und wie sich neue Patterns ergänzen lassen, ohne bestehende Screens zu destabilisieren.

## Fachliche Beschreibung

### UI-Komponenten-Dokumentation

#### 1. Ziel und Lesart

Dieses Dokument ist als technische Lesedokumentation aufgebaut, nicht als Datei-Inventar.

Es beschreibt:

- welche UI-Komponenten es gibt,
- wo sie in der GUI sichtbar sind,
- wie Wrapper, Ableitungen und Basiskomponenten zusammenarbeiten.

#### 2. GUI-Landkarte

#### Hauptnavigation

Die Anwendung ist in der linken Sidebar nach Funktionsbereichen gegliedert:

- Terminplanung: Wochen-, Monats-, Jahresansicht und Terminliste
- Projektplanung: Projekte und Kunden
- Mitarbeiterverwaltung: Mitarbeiter, Teams, Touren
- Administration: Notizvorlagen, Projektstatus, Hilfetexte, Benutzer, Einstellungen, Demo-Daten

#### Arbeitsfläche rechts

Die rechte Hauptfläche zeigt je nach Navigation:

- Listenansichten (Board/Tabelle),
- Detail-Formulare,
- Dialoge für Auswahl oder Bearbeitung,
- Kalenderansichten mit Bottom-Filterbereich.

#### 3. Architektur in einem Satz

`ListLayout` bildet den wiederkehrenden Seitenrahmen; innerhalb davon wechseln `BoardView` und `TableView`, während fachliche Badges auf `InfoBadge` aufbauen und Vorschauen über `HoverPreview` anzeigen.

#### 4. Komponenten mit GUI-Kontext

#### 4.1 Layout- und Seitenstruktur

#### `ListLayout`

**Kurztext:** Strukturkomponente für fast alle Listenbildschirme. Sie ordnet Kopfbereich, Inhaltsfläche, Filterbereich und Fußbereich einheitlich an.

**Wo sichtbar:** Kundenliste, Projektliste, Mitarbeiterliste, Terminliste, Hilfetexte, Notizvorlagen, Projektstatus sowie Dialoglisten (z. B. Mitarbeiterauswahl).

#### `BoardView`

**Kurztext:** Kartenraster für visuelle Übersichten. Eignet sich für „auf einen Blick“-Szenarien mit kompakten Karten.

**Wo sichtbar:** Board-Modus in Kunden, Projekten, Mitarbeitern, Hilfetexten, Notizvorlagen, Teams, Touren und Projektstatus.

#### `TableView`

**Kurztext:** Tabellarische Ansicht für dichte Daten, Sortierung und zielsichere Auswahl per Doppelklick.

**Wo sichtbar:** Tabellenmodus in Kunden, Projekten, Mitarbeitern, Hilfetexten; standardmäßig in der Terminliste und in Dialoglisten.

#### 4.2 Karten, Form-Rahmen und Dialograhmen

#### `EntityCard`

**Kurztext:** Einheitliche Karte für Board-Ansichten mit Titelbereich, Inhalt und optionalen Aktionen/Footer.

**Wo sichtbar:** Karten in Kunden-, Projekt- und Mitarbeiter-Boards.

#### `EntityFormLayout`

**Kurztext:** Formularrahmen für große Detail- und Bearbeitungsseiten mit klarer Aktionsleiste.

**Wo sichtbar:** Projektformular und Terminformular.

#### `EntityEditDialog`

**Kurztext:** Dialograhmen für fokussierte Bearbeitung innerhalb einer Liste ohne Seitenwechsel.

**Wo sichtbar:** Mitarbeiter-Detaildialog in der Mitarbeiterverwaltung.

#### 4.3 Filterkomponenten

#### `FilterPanel`

**Kurztext:** Technische Basiskomponente für Filter-Container mit konsistenter Typografie und Layout.

**Wo sichtbar:** Als Grundlage in allen spezialisierten Filterleisten.

#### `CustomerFilterPanel`

**Kurztext:** Filter für Name und Kundennummer zur schnellen Eingrenzung.

**Wo sichtbar:** Unterer Filterbereich der Kundenliste.

#### `ProjectFilterPanel`

**Kurztext:** Mehrteiliges Filterpanel für Projekttitel, Kundenbezug, Statusauswahl und Scope.

**Wo sichtbar:** Unterer Filterbereich der Projektliste.

#### `EmployeeFilterPanel`

**Kurztext:** Filter für Mitarbeitername plus Umschaltung aktiv/alle.

**Wo sichtbar:** Unterer Filterbereich der Mitarbeiterliste.

#### `AppointmentsFilterPanel`

**Kurztext:** Umfangreicher Filter für Terminliste (Mitarbeiter, Projekt, Kunde, Tour, Datum, Statusflags).

**Wo sichtbar:** Unterer Filterbereich der Terminliste.

#### `CalendarFilterPanel`

**Kurztext:** Schlanker Kalenderfilter für Mitarbeiterselektion.

**Wo sichtbar:** Fußbereich in Monats-, Wochen- und Jahreskalender.

#### 4.4 Badge-System (Wrapper und Ableitungen)

#### `InfoBadge` (Basis)

**Kurztext:** Neutrale Badge-Basis mit optionaler Hover-Vorschau und Add/Remove-Aktion.

**Wo sichtbar:** Nicht direkt fachlich, sondern als Fundament aller fachlichen Info-Badges.

#### `PersonInfoBadge` und `ColoredInfoBadge` (generische Wrapper)

**Kurztext:** `PersonInfoBadge` standardisiert Darstellung für Personen; `ColoredInfoBadge` kapselt farbcodierte Fachobjekte.

**Wo sichtbar:** Indirekt in Kunden-, Mitarbeiter-, Team-, Tour- und Statusdarstellungen.

#### Fachliche Badges

- `CustomerInfoBadge`: Kunde im Terminformular und in projektnahen Kontexten.
- `EmployeeInfoBadge`: Mitarbeiter in Terminformular, Team- und Tourverwaltung sowie Auswahl-/Editdialogen.
- `ProjectInfoBadge`: Projektbezug im Terminformular.
- `TeamInfoBadge`: Teamzuordnung in Mitarbeiterkarten und Mitarbeiterdetail.
- `TourInfoBadge`: Tourzuordnung in Mitarbeiterkarten, Mitarbeiterdetail und Terminbezug.
- `ProjectStatusInfoBadge`: Projektstatus in projektbezogenen Panels und Kalender-Teilansichten.
- `TerminInfoBadge`: Terminzusammenfassung in Termin-Panels.
- `AttachmentInfoBadge`: Dateianhänge in Attachment-Panels.

#### Preview-Ableitungen (`create...Preview`, `...Preview`)

**Kurztext:** Jeder fachliche Badge kann eine typisierte Vorschau erzeugen, ohne die Basis zu überladen.

**Wo sichtbar:** Hover-Vorschauen bei Badges und Terminzeilen, z. B. Termin-Wochenpanel-Preview in Tabellen.

#### 4.5 Formulare und fachliche Panel-Komponenten

#### `AppointmentForm`

**Kurztext:** Zentrales Terminformular für Neu- und Bearbeitung mit Projekt-, Tour- und Mitarbeiterbezug.

**Wo sichtbar:** Hauptarbeitsfläche bei Terminbearbeitung.

**GUI-Rolle:** kombiniert Badge-Informationen, Datums-/Zeitfelder, Auswahl-Dialoge und Konfliktbestätigungen.

#### `ProjectForm`

**Kurztext:** Projektformular mit Stammdaten, Kundenzuordnung, Notizen, Status und angehängten Bereichen.

**Wo sichtbar:** Hauptarbeitsfläche bei Projekterstellung und Projektbearbeitung.

**GUI-Rolle:** fungiert als fachliches Hub für Termine, Status und Anhänge eines Projekts.

#### `CustomerData`

**Kurztext:** Kundenstammdaten-Formular mit eingebetteten Zusatzpanels.

**Wo sichtbar:** Hauptarbeitsfläche in der Kunden-Detailansicht.

**GUI-Rolle:** vereint Kundenfelder, Terminbezug und Dateianhänge in einer Bearbeitungsansicht.

#### `ProjectAppointmentsPanel`, `CustomerAppointmentsPanel`, `EmployeeAppointmentsPanel`

**Kurztext:** Kontext-Panels für Terminbezug innerhalb eines Fachobjekts.

**Wo sichtbar:** In den jeweiligen Detailformularen/-dialogen rechts oder im unteren Abschnitt.

#### `ProjectAttachmentsPanel`, `CustomerAttachmentsPanel`, `EmployeeAttachmentsPanel`

**Kurztext:** Dateibezogene Panels für Upload, Anzeige und Zugriff auf verknüpfte Dokumente.

**Wo sichtbar:** In den jeweiligen Detailformularen oder Detaildialogen.

#### 4.6 Dialoglisten und Picker

#### `EmployeePickerDialogList`

**Kurztext:** Tabellarischer Auswahldialog für Mitarbeiter mit Filter und Preview.

**Wo sichtbar:** Im Terminformular und in Edit-Dialogen mit Mitarbeiterzuweisung.

#### `EmployeeAppointmentsTableDialog`

**Kurztext:** Tabellenfokussierter Termin-Dialog im Mitarbeiterkontext.

**Wo sichtbar:** Aus dem Mitarbeiter-Detaildialog heraus öffnend.

#### 5. Zusammenhänge (Wrapper, Ableitungen, Komposition)

#### Badge-Kompositionsketten

- `TeamInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `TourInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `CustomerInfoBadge -> PersonInfoBadge -> InfoBadge`
- `EmployeeInfoBadge -> PersonInfoBadge -> InfoBadge`
- `ProjectInfoBadge -> InfoBadge`
- `TerminInfoBadge -> InfoBadge`
- `AttachmentInfoBadge -> InfoBadge`

#### Preview-Ketten

- `TeamInfoBadge -> createTeamInfoBadgePreview -> TeamInfoBadgePreview`
- `TourInfoBadge -> createTourInfoBadgePreview -> TourInfoBadgePreview`
- `CustomerInfoBadge -> createCustomerInfoBadgePreview -> CustomerInfoBadgePreview`
- `EmployeeInfoBadge -> createEmployeeInfoBadgePreview -> EmployeeInfoBadgePreview`
- `ProjectInfoBadge -> createProjectInfoBadgePreview -> ProjectInfoBadgePreview`
- `TerminInfoBadge -> createAppointmentInfoBadgePreview -> AppointmentInfoBadgePreview`
- `AttachmentInfoBadge -> createAttachmentInfoBadgePreview -> AttachmentInfoBadgePreview`

#### Listenkomposition

- Seite/Dialog -> `ListLayout`
- Inhaltsmodus -> `BoardView` oder `TableView`
- Detailverdichtung -> Hover-Preview über `rowPreviewRenderer` oder Badge-Preview

#### 6. Public API-Dokumentationsstandard

Für jede Komponente wird dokumentiert:

- `Props` inkl. Pflichtfeldern und Defaults
- ausgehende Events/Callbacks (`on*`)
- Slots/Children bzw. Renderbereiche
- Weitergabe, Einschränkung oder Erweiterung bei Wrappern

Bei Ableitungen wird die Differenz zur Basiskomponente tabellarisch erfasst:

- Merkmal
- Basisverhalten
- Verhalten der Ableitung
- Grund der Abweichung

#### 7. A11y-, Theming- und Responsive-Hinweise

Pro Komponente werden verpflichtend beschrieben:

- semantische Struktur und Tastaturbedienung,
- verwendete Design-Tokens/Utility-Klassen,
- Verhalten auf schmalen Breiten (Umbruch, Scroll, Sticky Header, Grid-Wechsel).

#### 8. Best Practices und Anti-Patterns

#### Best Practices

- Fachwissen in Wrappern kapseln, Basiskomponenten technisch halten.
- Ein Preview-Typ pro Fachobjekt, klar benannt und wiederverwendbar.
- In Listen nur einen Interaktionspfad pro Aktion (z. B. Doppelklick zum Öffnen).

#### Anti-Patterns

- Fachregeln direkt in `ListLayout`, `TableView` oder `InfoBadge`.
- Uneinheitliche Filterposition zwischen vergleichbaren Listen.
- Mehrere konkurrierende Vorschau-Mechanismen für denselben Datentyp.

#### 9. Migration und Deprecation

Wenn Komponenten ersetzt werden, wird immer dokumentiert:

- Altkomponente und Nachfolger,
- API-Unterschiede,
- Migrationshinweis für Aufrufer,
- Lifecycle-Status (`aktiv`, `deprecated`, `experimentell`).

Bekannte abgeschlossene Altstruktur:

- früheres `badgeType`/`badgeData`-Pattern entfernt
- zentrale Registry für Badge-Previews entfernt

#### 10. Pflegeprozess

Dokumentationsupdate ist Pflicht bei:

- neuer Komponente,
- API-Änderung,
- neuer Wrapper- oder Ableitungskette,
- Deprecation/Entfernung.

Arbeitsreihenfolge:

1. Komponentenporträt aktualisieren.
2. GUI-Kontext prüfen und ergänzen.
3. Zusammenhangslisten (Komposition/Preview) nachziehen.
4. Lifecycle-Status setzen.

#### 11. Template für neue Komponentenporträts

```markdown
## <Komponentenname>
- Kategorie: `Basis | Wrapper | Ableitung | Fachkomponente`
- Status: `aktiv | deprecated | experimentell`
### Kurzbeschreibung
<2-4 Sätze mit fachlichem Nutzen>
### Wo sichtbar in der GUI
- <Ansicht/Formular/Dialog>
- <Position im Screen, z. B. Header, Content, Footer, rechter Panelbereich>
### Public API
| Element | Typ | Pflicht | Default | Bedeutung |
|---|---|---|---|---|
| `<prop oder event>` | `<type>` | `ja/nein` | `<wert>` | `<text>` |
### Beziehungen
- Verwendet: <Basis/Helper>
- Verwendet von: <Screens/Formulare/Wrapper>
- Ableitungen: <falls vorhanden>
### Hinweise
- A11y:
- Responsiveness:
- Bekannte Einschränkungen:
```

## Regeln & Randbedingungen

Die Kompositionsschicht enthält ausschließlich Layout- und Strukturkomponenten, die keine fachliche Logik besitzen und keine Datenhaltung erzwingen. Fachlogik, Mutationen und Validierungen verbleiben in den Feature-Screens oder in fachnahen Hooks, während die Kompositionskomponenten nur definierte Slots bereitstellen.

Die Vorlagen sollen so geschnitten sein, dass sie in mehreren Screens wiederverwendbar sind, ohne dass diese Screens Layout-Sonderfälle in die Vorlagen hineindrücken müssen. Wenn ein Sonderfall häufiger wird, wird er als Erweiterung des Patterns dokumentiert und als neue, bewusst benannte Variante umgesetzt, statt über ad-hoc Props und Ausnahmen zu wachsen.

Hilfetexte werden systemweit über einen `helpKey` angebunden. Wenn ein `helpKey` gesetzt ist, muss die UI konsistent einen Hilfe-Trigger anzeigen und den Hilfetext über denselben Mechanismus laden und darstellen, wie es die bestehenden List-Layouts bereits tun. Damit ist gewährleistet, dass Hilfetexte zentral gepflegt werden können und das Nutzererlebnis unabhängig vom Screen gleich bleibt.

Neue Kompositionskomponenten werden nur dann eingeführt, wenn sie mindestens zwei echte Wiederholungsfälle vereinheitlichen oder absehbar ein Standardpattern etablieren. Reine „Einmal-Wrapper“ ohne Wiederverwendung sind nicht Teil dieser Schicht.

# FT (18): User Preferences

## ZIEL / ZWECK

Dieses Feature stellt editierbare Einstellungen zu App-Funktionen direkt in der Anwendung bereit. Ziel ist, dass definierte Verhaltensweisen und Parameter ohne Code-Änderungen konfigurierbar sind und die Lösung auch bei wachsender Anzahl und Vielfalt von Einstellungstypen stabil und wartbar bleibt.

## FACHLICHE BESCHREIBUNG

Die Anwendung bietet eine zentrale Oberfläche, in der berechtigte Nutzer Einstellungen anzeigen und ändern können. Jede Einstellung ist durch einen eindeutigen Schlüssel identifiziert und besitzt einen fest definierten Datentyp sowie einen Standardwert. Der wirksame Wert ergibt sich aus einem gespeicherten Wert; sofern kein Wert gespeichert ist, gilt der Standardwert.

Die Eingabe und Darstellung in der UI erfolgt generisch anhand des Einstellungstyps. Bool-Einstellungen werden als Schalter bedient, Zahlen als numerische Eingabe und Farben über eine Farbauswahl. Das System ist so gestaltet, dass weitere Typen und neue Einstellungen ergänzt werden können, ohne dass dafür für jede Einstellung eine eigene Persistenzlogik oder ein eigener Screen erforderlich wird.

## REGELN & RANDBEDINGUNGEN

Eine Einstellung darf nur gespeichert werden, wenn der Wert zum definierten Typ passt und die fachlich vorgesehenen Constraints erfüllt. Ungültige Eingaben werden abgelehnt und mit einer verständlichen Fehlermeldung zurückgemeldet.

Jede Einstellung besitzt einen Standardwert. Wenn kein Wert gespeichert ist, wird ausschließlich der Standardwert verwendet. Der aktuell wirksame Wert muss in der UI transparent angezeigt werden.

Berechtigungen müssen eindeutig greifen. Normale Nutzer dürfen ausschließlich ihre benutzerspezifischen Einstellungen bearbeiten. Administratoren dürfen zusätzlich Einstellungen bearbeiten, die in einem übergeordneten Kontext gelten, sofern solche Kontexte im Produkt genutzt werden.

Zu Beginn müssen mindestens die Typen Zahl, Bool (Aktivität) und Farbe unterstützt werden. Weitere Typen wie Text, Auswahlwerte (Enum) oder Wertebereiche (Min/Max/Step) sollen später ohne Bruch ergänzt werden können.

## USE CASES

### UC: PERSÖNLICHE EINSTELLUNG ÄNDERN

**AKTEUR**

Nutzer

**ZIEL**

Der Nutzer passt eine persönliche Einstellung an, sodass die App sich entsprechend verhält.

**VORBEDINGUNGEN**

Der Nutzer ist angemeldet.

Der Nutzer ist berechtigt, die betroffene Einstellung zu bearbeiten.

Die Einstellung ist in der Oberfläche sichtbar.

**ABLAUF**

Der Nutzer öffnet die Seite „Einstellungen“.

Der Nutzer sieht den aktuell wirksamen Wert der Einstellung.

Der Nutzer ändert den Wert über das zum Typ passende Eingabeelement.

Der Nutzer speichert die Änderung.

Das System validiert den Wert und übernimmt ihn bei Erfolg.

**ALTERNATIVEN**

Der Nutzer bricht den Vorgang ab, dann bleibt der bisher wirksame Wert unverändert.

Der Nutzer gibt einen ungültigen Wert ein, dann lehnt das System ab und zeigt eine Fehlermeldung; es wird nichts gespeichert.

**ERGEBNIS**

Der neue Wert ist gespeichert und für den Nutzer wirksam.

# FT (19): Attachments

## Ziel / Zweck

Dieses Feature stellt eine domänenübergreifende Infrastruktur zur Verfügung, um Dateien strukturiert an fachliche Objekte zu binden. Ziel ist es, Upload, Speicherung, Anzeige und Download von Dokumenten einheitlich, sicher und wartbar umzusetzen, ohne die jeweilige Fachdomäne mit technischer Dateilogik zu belasten.

Attachments sind keine fachlichen Kerndaten, sondern ergänzende Dokumente zur Dokumentation, Nachvollziehbarkeit und Kommunikation.

## Fachliche Beschreibung

Ein Attachment ist eine Datei, die eindeutig einem Parent-Objekt zugeordnet ist. Ein Attachment kann nie ohne Parent existieren.

Das System unterstützt Attachments aktuell für folgende Domänen:

- Projekt
- Kunde
- Mitarbeiter

Die technische Behandlung ist für alle Domänen identisch. Unterschiede bestehen ausschließlich in der Parent-Zuordnung.

Ein Attachment besitzt Metadaten wie:

- Originaldateiname
- Persistenter Speichername
- MIME-Typ
- Dateigröße
- Erstellungszeitpunkt

Dateien werden serverseitig gespeichert und über einen gesicherten Download-Endpunkt ausgeliefert. Die UI zeigt Attachments als kompakte Liste mit Vorschau- bzw. Download-Funktion.

Das Öffnen eines Attachments kann je nach Dateityp inline (z. B. PDF, Bild) oder als Download erfolgen. Eine explizite Download-Option ist zusätzlich verfügbar.

Eine physische Löschung von Attachments ist systemweit nicht vorgesehen.

## Regeln & Randbedingungen

### Allgemeine Struktur

- Ein Attachment gehört immer genau einem Parent-Objekt.
- Ein Attachment kann nie ohne Parent-Zuordnung existieren.
- Für jede unterstützte Domäne existiert eine eigene Attachment-Tabelle.
- Die Tabellen sind strukturgleich aufgebaut.
- Zwischen Parent und Attachment besteht eine referenzielle Integrität (FK).

### Upload

- Upload erfolgt über Multipart-Request.
- Feldname für die Datei ist systemweit einheitlich.
- Es gilt eine definierte maximale Dateigröße.
- Der Originaldateiname wird serverseitig sanitisiert.
- Der persistente Dateiname wird eindeutig generiert.
- Metadaten werden in der jeweiligen Attachment-Tabelle gespeichert.

Ungültige Dateien oder Überschreiten der Größenbegrenzung führen zu einem Fehler und werden nicht gespeichert.

### Speicherung

- Dateien werden serverseitig in einem definierten Upload-Verzeichnis gespeichert.
- Der physische Speicherort wird nicht vom Client bestimmt.
- Der Storage-Pfad wird als Metadatum gespeichert.
- Attachments werden nicht versioniert.

### Download

- Download erfolgt ausschließlich über definierte API-Endpunkte.
- Der Endpunkt liefert:
    - korrekten MIME-Typ
    - passende Content-Disposition
- Für bestimmte Dateitypen (z. B. PDF, Bilder) kann Inline-Anzeige erlaubt sein.
- Über einen expliziten Parameter kann Download erzwungen werden.

Direkter Zugriff auf das Upload-Verzeichnis ist nicht vorgesehen.

### Löschung

- Eine Löschfunktion für Attachments ist systemweit deaktiviert.
- Es existiert kein fachlicher Use Case zur physischen Entfernung von Dateien.
- API-seitig sind Delete-Endpunkte entweder nicht vorhanden oder blockiert.
- Die Entscheidung zur Nicht-Löschung ist bewusst systemweit einheitlich.

### Sicherheit und Verantwortlichkeit

- Die Parent-Existenz wird vor Speicherung eines Attachments geprüft.
- Attachments haben keine eigenständigen Berechtigungen, sondern folgen den Berechtigungen ihres Parents.
- UI-seitige Einschränkungen ersetzen keine serverseitige Prüfung.
- Der Download erfolgt ausschließlich nach erfolgreicher Identifikation des Attachments.

## Use Cases

### UC: Attachment hochladen

**Akteur**

Disponent

**Ziel**

Eine Datei einem bestehenden Parent-Objekt (z. B. Projekt, Kunde oder Mitarbeiter) hinzufügen.

**Vorbedingungen**

- Das Parent-Objekt existiert.
- Der Benutzer ist berechtigt, das Parent-Objekt zu bearbeiten.
- Die Detailansicht des Parent-Objekts ist geöffnet.

**Ablauf**

1. Der Benutzer wählt die Funktion „Attachment hinzufügen“.
2. Das System öffnet einen Dateiauswahldialog.
3. Der Benutzer wählt eine Datei aus.
4. Das System überträgt die Datei per Multipart-Request an den Server.
5. Das System speichert die Datei im definierten Upload-Verzeichnis.
6. Das System speichert die Metadaten in der entsprechenden Attachment-Tabelle.
7. Das System aktualisiert die Attachmentliste in der UI.

**Alternativabläufe**

- Upload wird abgebrochen → Es wird kein Attachment gespeichert.
- Fehler bei Speicherung → Das System zeigt eine Fehlermeldung und speichert nichts.

**Ergebnis**

Die Datei ist gespeichert und eindeutig dem Parent-Objekt zugeordnet.

### UC: Attachmentliste anzeigen

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Alle einem Parent-Objekt zugeordneten Attachments einsehen.

**Vorbedingungen**

- Das Parent-Objekt existiert.
- Der Benutzer besitzt Leserechte.

**Ablauf**

1. Der Benutzer öffnet die Detailansicht des Parent-Objekts.
2. Das System lädt alle zugeordneten Attachments.
3. Das System zeigt eine strukturierte Liste mit Dateiname und Metadaten an.

**Alternativabläufe**

- Keine Attachments vorhanden → Das System zeigt eine leere Liste an.

**Ergebnis**

Die vorhandenen Attachments des Parent-Objekts sind sichtbar.

### UC: Attachment öffnen (Inline-Anzeige)

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Ein Attachment direkt im Browser anzeigen, sofern der Dateityp dies unterstützt.

**Vorbedingungen**

- Das Attachment existiert.
- Der Benutzer besitzt Leserechte.

**Ablauf**

1. Der Benutzer wählt ein Attachment aus der Liste.
2. Das System ruft den Download-Endpunkt auf.
3. Das System liefert die Datei mit korrektem MIME-Typ und Inline-Disposition aus.
4. Der Browser zeigt die Datei an (z. B. PDF oder Bild).

**Alternativabläufe**

- Dateityp nicht inlinefähig → Das System liefert die Datei als Download.

**Ergebnis**

Das Attachment wird im Browser angezeigt oder entsprechend behandelt.

### UC: Attachment herunterladen

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Ein Attachment lokal speichern.

**Vorbedingungen**

- Das Attachment existiert.
- Der Benutzer besitzt Leserechte.

**Ablauf**

1. Der Benutzer wählt die Download-Funktion für ein Attachment.
2. Das System ruft den Download-Endpunkt mit Download-Parameter auf.
3. Das System liefert die Datei mit korrekter Content-Disposition „attachment“.
4. Der Browser startet den Download.

**Alternativabläufe**

- Datei nicht auffindbar → Das System liefert eine Fehlermeldung.

**Ergebnis**

Die Datei wird lokal gespeichert.

### UC: Attachment-Upload validieren (Größe / Typ)

**Akteur**

System

**Ziel**

Sicherstellen, dass nur zulässige Dateien gespeichert werden.

**Vorbedingungen**

- Eine Datei wurde zum Upload übergeben.

**Ablauf**

1. Das System prüft die Dateigröße gegen das definierte Limit.
2. Das System prüft grundlegende Dateieigenschaften (z. B. MIME-Typ).
3. Bei gültiger Datei wird der Upload fortgesetzt.
4. Bei ungültiger Datei wird der Upload abgebrochen.

**Alternativabläufe**

- Datei überschreitet Größenlimit → Das System antwortet mit Fehler.
- Datei ungültig → Das System speichert nicht und meldet den Fehler.

**Ergebnis**

Nur valide Dateien werden persistiert.

### UC: Attachment einem Parent-Objekt zuordnen

**Akteur**

System

**Ziel**

Ein Attachment eindeutig mit einem bestehenden Parent-Objekt verknüpfen.

**Vorbedingungen**

- Das Parent-Objekt existiert.
- Die Datei wurde erfolgreich gespeichert.

**Ablauf**

1. Das System prüft die Existenz des Parent-Objekts.
2. Das System erzeugt einen Attachment-Datensatz mit Parent-ID.
3. Das System speichert den Datensatz in der domänenspezifischen Attachment-Tabelle.

**Alternativabläufe**

- Parent nicht vorhanden → Speicherung wird abgebrochen.

**Ergebnis**

Das Attachment ist eindeutig und referenziell korrekt dem Parent-Objekt zugeordnet.

# FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung

## Ziel / Zweck

Dieses Feature definiert die fachliche Bedeutung der Rollen **Admin**, **Disponent(in)** und **Monteur** innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfügbar sind.

Ziel ist es, eine klare Verantwortungsstruktur im System zu etablieren, ohne die bestehende Daten- oder Terminlogik zu verändern. Die Zugriffsbeschränkungen betreffen ausschließlich Sichtbarkeit, Bedienbarkeit und serverseitig durchgesetzte Autorisierung.

Die fachliche Sicherheit bleibt stets serverseitig abgesichert (vgl. FT (14)); FT (20) ergänzt diese Grundlage um UI-seitige Steuerung und klare Nutzungsmodelle.

## Fachliche Beschreibung

Jeder Benutzer besitzt genau eine Rolle. Diese Rolle definiert seinen funktionalen Handlungsspielraum im System.

Die Anwendung unterscheidet drei Rollen:

### 1. Admin

Der Admin besitzt systemweite Verantwortung.

Er darf:

- Benutzer verwalten und Rollen ändern
- Systemnahe Stammdaten verwalten
- Gesperrte Termine bearbeiten
- Alle Funktionen der Disposition nutzen

Der Admin ist die höchste Berechtigungsstufe. Es muss stets mindestens ein Admin im System existieren.

### 2. Disponent(in)

Der Disponent ist der operative Hauptnutzer der Anwendung.

Er darf:

- Projekte anlegen, bearbeiten und deaktivieren
- Termine anlegen, verschieben, bearbeiten und löschen
- Mitarbeiter zuweisen
- Touren und Teams verwalten
- Notizen und Anhänge verwalten
- Druckfunktionen nutzen

Der Disponent darf keine Benutzerrollen ändern und keine systemweiten Administrationsfunktionen ausführen.

### 3. Monteur

Der Monteur ist ein rein lesender Nutzer.

Er darf:

- Kalenderansichten anzeigen
- Projekt- und Kundendetails einsehen
- Eigene und fremde Termine einsehen
- Dispositionsübersichten lesen

Der Monteur darf keine Daten verändern, anlegen oder löschen.

Die Oberfläche für Monteure ist funktional reduziert und enthält keine aktiven Bearbeitungselemente.

## Grundprinzipien

1. Sicherheit wird serverseitig durchgesetzt.
2. UI-Sichtbarkeit ist eine Komfortfunktion, keine Sicherheitsmaßnahme.
3. Die fachliche Datenstruktur bleibt unverändert.
4. Es wird keine Rechte-Matrix eingeführt.
5. Rollen wirken ausschließlich auf Funktionsverfügbarkeit, nicht auf Datenmodellierung.

## Regeln & Randbedingungen

- Rollen ändern keine Datenmodelle.
- Rollen beeinflussen keine Aggregationslogik.
- Rollen beeinflussen keine Query-Struktur.
- Rollen verändern keine Termin-Lane-Logik.
- Navigation wird nicht umstrukturiert, sondern nur ergänzt oder konditional gerendert.
- Deep-Link-Aufrufe werden serverseitig validiert.
- Es darf keine clientseitige Autorisierungslogik ohne serverseitige Gegenprüfung existieren.
- Ein Monteur sieht alle Termine, jedoch ausschließlich im Lesemodus.
- Der letzte Admin darf nicht entfernt oder herabgestuft werden.

## Use Cases

### UC: Unzulässige Aktion wird blockiert

**Akteur**

Benutzer ohne ausreichende Rolle

**Ziel**

Verhindern einer nicht erlaubten Mutation.

**Vorbedingungen**

Benutzer besitzt nicht die erforderliche Rolle.

**Ablauf**

1. Benutzer versucht geschützte Aktion.
2. Server prüft Rolle.
3. Server antwortet mit 403 und maschinenlesbarem Fehlercode.

**Ergebnis**

Keine Datenänderung. System bleibt konsistent.

### UC: Rollenabhängige Navigation anzeigen

**Akteur**

Angemeldeter Benutzer

**Ziel**

Die Navigation zeigt nur die für die Rolle vorgesehenen Bereiche.

**Vorbedingungen**

Der Benutzer ist authentifiziert und besitzt eine Rolle.

**Ablauf**

1. Benutzer öffnet die Anwendung.
2. Das System bestimmt serverseitig die Rolle.
3. Die Navigation wird entsprechend gerendert.
4. Nicht erlaubte Bereiche erscheinen nicht in der Sidebar.

**Alternativen**

Direktaufruf eines nicht erlaubten Bereichs → Server blockiert mit 403.

**Ergebnis**

Die Oberfläche entspricht der funktionalen Rolle des Benutzers.

### UC: Admin verwaltet Benutzerrollen

**Akteur**

Admin

**Ziel**

Benutzerrollen ändern.

**Vorbedingungen**

Der Admin ist angemeldet. Mindestens ein weiterer Admin existiert oder der aktuelle bleibt erhalten.

**Ablauf**

1. Admin öffnet Benutzerverwaltung.
2. Admin wählt Benutzer.
3. Admin ändert Rolle.
4. System validiert: letzter Admin darf nicht entfallen.
5. System speichert Änderung.

**Alternativen**

Letzter Admin soll entfernt werden → System blockiert.

**Ergebnis**

Die neue Rolle ist gespeichert und wirksam.

# FT (21): KI-gestützte Dokumentenextraktion

## Ziel / Zweck

FT (21) erweitert das System um eine kontextgebundene Dokumentenextraktion zur Unterstützung der Disposition.

Aus einem textbasierten Auftragsdokument (PDF) sollen automatisiert folgende Daten extrahiert werden:

- Kundendaten gemäß bestehendem Kundenschema
- Saunamodell (als Projekttitel-Vorschlag)
- Artikelliste (Menge + Beschreibung, mehrzeilig möglich, ohne Preise)

Die extrahierten Daten werden als editierbarer Vorschlag präsentiert und können in das aktuelle Formular (Neues Projekt oder Neuer Termin) übernommen werden.

Das Feature dient ausschließlich der Arbeitserleichterung.

Es ersetzt keine bestehende Validierungs- oder Sicherheitslogik.

## Fachliche Beschreibung

Die Extraktionsfunktion ist ausschließlich in folgenden Kontexten verfügbar:

- Formular **Neues Projekt**
- Formular **Neuer Termin**

Die Disponentin kann ein PDF in einen definierten Extraktionsbereich ziehen.

Das System:

1. Extrahiert den Text aus dem Dokument.
2. Segmentiert strukturelle Bereiche (Kunde, Artikelliste, Auftragsblock).
3. Extrahiert strukturierte Kundendaten.
4. Extrahiert eine Artikelliste.
5. Erkennt das Saunamodell.
6. Kategorisiert die Artikelliste semantisch.
7. Liefert ein validiertes Ergebnis zurück.

### KI-Zusatzfunktion: Kategorisierung

Die extrahierte Artikelliste wird semantisch gruppiert und sortiert.

Beispielhafte Kategorien:

- Saunatyp
- Dachvariante
- Farbe
- Ofen
- Fenster
- Inneneinrichtung
- Zubehör
- Sondermaße
- Einzelteile

Die Kategorisierung darf die ursprünglichen Inhalte nicht verändern.

Bei Unsicherheit bleibt die ursprüngliche Reihenfolge erhalten.

## Präsentation

Nach erfolgreicher Extraktion erscheint ein schwebender Dialog.

### Bereich 1 – Kundendaten

Nachbildung des Kunden-Edit-Formulars mit vorbefüllten Feldern.

Alle Felder sind editierbar.

### Bereich 2 – Projektvorschlag

Titelfeld:

- Vorgefüllt mit erkanntem Saunamodell.

Editorfeld (RTF/HTML-kompatibel):

- Extrahierte, sortierte Artikelliste.
- Darstellung als strukturierte HTML-Auflistung.
- Vollständig editierbar.

## Regeln & Randbedingungen

- Die Verarbeitung erfolgt ausschließlich serverseitig.
- Es werden keine Dokumente oder Texte an externe Dienste übertragen.
- Das KI-Modell läuft lokal.
- Dokumenttexte werden nicht persistiert.
- Prompts und Rohtexte werden nicht geloggt.
- Die KI-Ausgabe gilt als nicht vertrauenswürdig und wird vollständig validiert.
- Ungültige oder unvollständige Daten dürfen nicht gespeichert werden.
- Die Speicherung erfolgt nur nach Benutzerbestätigung.
- Rollen- und Berechtigungslogik wird serverseitig geprüft.
- FT (21) verändert das Attachment-Modell aus FT (19) nicht.
- FT (21) verändert keine bestehenden Domänenmodelle.
- Das Feature darf keine impliziten Datenänderungen auslösen.
- Bei strukturell ungeeigneten Dokumenten muss der Prozess sauber abbrechen.

## **Use Cases**

### UC: Dokumentextraktion starten

**Akteur**

Disponent oder Admin

**Ziel**

Ein Attachment analysieren und strukturierte Daten extrahieren.

**Vorbedingungen**

- Ein Attachment existiert.
- Der Benutzer besitzt ausreichende Berechtigung.
- Das Dokument ist technisch lesbar.

**Ablauf**

1. Der Benutzer wählt ein Attachment.
2. Der Benutzer startet die Extraktion.
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text über die KI-Schicht.
5. Das System validiert das Ergebnis.
6. Das System zeigt die extrahierten Daten als Vorschlag an.

**Alternativen**

- Dokument nicht lesbar → Fehlermeldung.
- Validierung schlägt fehl → strukturierter Fehlerstatus.

**Ergebnis**

Strukturierter, editierbarer Vorschlag wird angezeigt.

### UC: Extrahierte Daten bestätigen

**Akteur**

Disponent oder Admin

**Ziel**

Extrahierte Daten prüfen, anpassen und übernehmen.

**Vorbedingungen**

- Ein validierter Extraktionsvorschlag liegt vor.

**Ablauf**

1. Benutzer prüft Kundendaten.
2. Benutzer korrigiert ggf. Felder.
3. Benutzer prüft Artikelliste.
4. Benutzer bestätigt Übernahme.
5. System speichert Daten in den entsprechenden Domänen.

**Alternativen**

- Benutzer bricht ab → keine Speicherung.
- Validierungsfehler bei Speicherung → Fehlermeldung.

**Ergebnis**

Daten sind persistiert und fachlich korrekt zugeordnet.

### UC: Ungeeignetes Dokument behandeln

**Akteur**

Disponent

**Ziel**

Fehlverarbeitung bei ungeeigneten Dokumenten vermeiden.

**Vorbedingungen**

- Dokument enthält keine strukturierbaren Daten.

**Ablauf**

1. Benutzer startet Extraktion.
2. System erkennt unzureichende Struktur oder Validierungsfehler.
3. System bricht mit klarer Meldung ab.

**Ergebnis**

Keine Datenänderung. System bleibt konsistent.

### UC: Kategorisierung schlägt fehl

Wenn die semantische Gruppierung nicht eindeutig möglich ist:

- Artikelliste wird in Originalreihenfolge angezeigt.
- Keine Blockade des Prozesses.

### UC: Dokumentextraktion im Formular „Neues Projekt“ starten

**Akteur:** Disponent / Admin

**Vorbedingungen:**

- Formular „Neues Projekt“ geöffnet
- Berechtigung vorhanden

**Ablauf:**

1. Benutzer zieht PDF in Extraktionsbereich.
2. System verarbeitet Dokument.
3. Ergebnisdialog erscheint.

**Ergebnis:**

Editierbarer Vorschlag wird angezeigt.

### UC: Dokumentextraktion im Formular „Neuer Termin“ starten

Analog zum Projekt-Kontext, jedoch mit Termin-spezifischen Scope-Regeln.

### UC: Kundendaten übernehmen – Scope Neues Projekt

### Fall A: Kein Kunde ausgewählt

- Nachfrage: „Kunde mit den erkannten Daten neu anlegen?“
- Duplikatsprüfung erfolgt.
- Kunde wird angelegt und im Projekt gesetzt.

### Fall B: Kunde bereits ausgewählt

- Nachfrage: „Der aktuell gewählte Kunde wird ersetzt. Fortfahren?“
- Bei Bestätigung wird Kunde neu angelegt und verknüpft.
- Bei Abbruch keine Änderung.

### UC: Kundendaten übernehmen – Scope Neuer Termin

**Vorbedingung:**

- Kein Projekt ausgewählt.

Nach Bestätigung:

- Neuer Kunde wird angelegt.
- Duplikatsprüfung erfolgt.
- Kunde wird im Terminformular gesetzt.

### UC: Projekt übernehmen – Scope Neues Projekt

### Fall A: Titel/Beschreibung leer

- Titel wird gesetzt.
- Artikelliste wird als HTML eingefügt.

### Fall B: Felder bereits befüllt

- Warnhinweis vor Überschreiben.
- Nur bei Bestätigung Übernahme.

### UC: Projekt übernehmen – Scope Neuer Termin

**Vorbedingung:**

- Kein Projekt ausgewählt.

Nach Bestätigung:

1. Neues Projekt wird angelegt.
2. Titel = erkanntes Saunamodell.

1. Beschreibung = HTML-Artikelliste.
2. Projekt wird im Termin gesetzt.
3. Kunde wird automatisch verknüpft.