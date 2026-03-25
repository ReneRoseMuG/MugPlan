# Log: Analyse der Regression im Workflow Neuer Termin -> Dok Extrakt -> Neues Projekt

## Zweck

Dieses Log dokumentiert die nachtraegliche Ursachenanalyse fuer den vom Nutzer gemeldeten Fehler im Workflow:

`Neuer Termin -> Dok Extrakt -> Neues Projekt`

Symptom:

- Im Projektformular laesst sich die Artikelliste im Create-Modus nicht sauber bedienen.
- Bei Auswahl eines Produktes oder einer Komponente in den Dropdowns springt der Wert sofort wieder auf den ersten Eintrag zurueck.
- Das Verhalten tritt im Kontext des neu angelegten Projekts aus dem Termin-/Dok-Extrakt-Flow auf.
- Laut Nutzer tritt das Problem ab einem spaeteren Stand auf `work` auf, nicht jedoch im Commit `3894702`.

Ziel dieser Analyse war es, die wahrscheinlichsten Einfuehrungs-Commits nach `3894702` zu identifizieren, ohne neue Produktlogik zu veraendern.

## Ausgangslage

Der Nutzer hat explizit angegeben:

- Im letzten Commit `3894702` auf `work` existiert das Problem nicht.
- Danach wurden mehrere Aenderungen an Dokumentextraktion, Overlays und der Darstellung extrahierter Daten im Terminformular eingefuehrt.
- Gesucht waren die wahrscheinlichsten Kandidaten, durch die der Fehler in den Code geraten ist.

Die Analyse wurde bewusst commit-zentriert durchgefuehrt und auf die direkt betroffenen Dateien beschraenkt:

- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- zugehoerige Browsertests fuer den Create-/Overlay-Flow

## Untersuchte Historie

Verglichene Historie ab `3894702..work`:

- `0cac082` `fix: load project article items in appointment fallback`
- `a196394` `fix: stabilize project create form and attachment delete flows`

Zusatzlich wurden fruehere, fachlich naheliegende Commits auf denselben Dateien betrachtet, insbesondere:

- `a18ce68` `fix: Stammdaten-Änderungen immer frisch in Formular-Artikelliste`
- `8e43665` `fix: Auswahl in Artikelliste-Dropdowns zurücksetzen ermöglichen`
- `feca523` `Align new appointment form sidebar flow`
- `5e2b7ca` `Fix extracted appointment attachment handoff to project`
- `95d9069` `Implement document extraction overlays and duplicate resolution`

## Technische Beobachtungen

### 1. Der Fehler sitzt sehr wahrscheinlich im Create-Initialisierungspfad des `ProjectForm`

Der spaetere Session-Fix `a196394` hat den folgenden Mechanismus direkt adressiert:

- Im Create-Modus initialisiert `ProjectForm` die Artikellisten-Selections ueber einen Effekt.
- Dieser Effekt haengt indirekt an Stammdaten bzw. an den daraus berechneten `dynamicCategorySlots`.
- Wenn diese Basis nach dem ersten Render erneut aktualisiert wird, werden `productSelections` und `dynamicProductSelections` nochmals auf leer gesetzt.

Genau das erklaert das beobachtete Verhalten:

- Nutzer waehlt in einem Dropdown einen Wert.
- Kurz danach laeuft der Create-Reset erneut.
- Das kontrollierte Select springt sichtbar zurueck auf die leere Option.

Der spaetere Guard in `a196394` (`didInitializeCreateFormRef`) verhindert genau dieses mehrfache Re-Initialisieren im Create-Modus.

### 2. Das Problem ist fachlich klar vom Edit-Modus getrennt

Die Analyse bestaetigt die Beobachtung des Nutzers:

- Bestehende Projekte im Edit-Modus sind nicht betroffen.
- Der Fehler ist create-spezifisch.

Das passt zur Code-Struktur:

- Im Edit-Modus wird der Formularzustand aus `projectData` aufgebaut.
- Im Create-Modus laeuft der gefaehrdete Reset-Zweig.

### 3. Der Termin-/Dok-Extrakt-Flow ist wahrscheinlich nicht die primaere Ursache, aber der staerkste Ausloeser

Die grossen Dok-Extract-/Overlay-Commits veraendern vor allem:

- den Uebergang vom Terminformular ins Projektformular
- die Overlay-Darstellung fuer neue und bestehende Projekte
- den Handoff extrahierter Daten, Attachments und Duplicate-Resolution

Dadurch wurde der Create-Pfad des `ProjectForm` intensiver genutzt und die Re-Initialisierung offenbar sichtbar oder reproduzierbar gemacht.

## Kandidatenbewertung

### Kandidat 1: `a18ce68`

Commit:

- `a18ce68` `fix: Stammdaten-Änderungen immer frisch in Formular-Artikelliste`

Bewertung:

- Hoechstwahrscheinlicher Einfuehrungs-Commit

Warum dieser Commit stark verdaechtig ist:

- In `ProjectForm.tsx` wurden die Stammdaten-Queries auf `staleTime: 0` umgestellt.
- Zusaetzlich wurden explizite `queryFn`s gesetzt.
- Dadurch werden Produkte, Komponenten und Kategorien konsequenter frisch geladen.

Fachlicher Nutzen dieses Commits:

- Formular-Artikelliste sollte Stammdaten-Aenderungen unmittelbar sehen.

Technisches Risiko dieses Commits:

- Sobald die zugrunde liegenden Stammdaten haeufiger refetchen oder sich die Slot-Basis erneut berechnet, kann der Create-Initialisierungseffekt nochmals laufen.
- Genau das ist die wahrscheinlichste technische Ursache fuer das Zurueckspringen der Selections.

Kurzfazit:

- Sehr wahrscheinlicher Root-Cause-Commit.

### Kandidat 2: `95d9069`

Commit:

- `95d9069` `Implement document extraction overlays and duplicate resolution`

Bewertung:

- Zweitstaerkster Kandidat

Warum dieser Commit relevant ist:

- `pendingProjectDraft` wurde auf zwei Modi erweitert:
  - `mode: "create"`
  - `mode: "existing"`
- Im `ProjectForm` wurde `effectiveProjectId`/`resolvedExistingProjectId` eingefuehrt.
- `initialDocumentExtractionFile` wird seither anders behandelt.
- Der Overlay-Flow vom Terminformular ins Projektformular wurde erheblich umgebaut.

Fachlicher Nutzen dieses Commits:

- Duplicate-Resolution fuer Auftragsnummern
- vorhandenes Projekt statt Neuanlage oeffnen
- extrahierte Daten im Overlay differenzierter behandeln

Technisches Risiko dieses Commits:

- Der Create/Edit-Zustand des `ProjectForm` wird komplexer.
- Zustaende wechseln dynamischer zwischen reinem Create, bestehendem Projekt und Overlay-Rueckweg.
- Ein bereits vorhandener Reset-Bug im Create-Zweig konnte dadurch viel deutlicher sichtbar werden.

Kurzfazit:

- Sehr plausibler Sichtbarmacher oder Verstaerker des Fehlers.
- Weniger wahrscheinlich als primaere Ursache als `a18ce68`, aber klar in der engeren Kandidatengruppe.

### Kandidat 3: `feca523`

Commit:

- `feca523` `Align new appointment form sidebar flow`

Bewertung:

- Mittlerer Kandidat

Warum dieser Commit relevant ist:

- Create-Sidebar fuer den neuen Termin wurde stark ausgebaut.
- Draft-Tags, Draft-Notes und Draft-Attachments wurden in `AppointmentForm` eingefuehrt.
- Der neue Termin-Flow und der Handoff in spaetere Persistenzpfade wurden erheblich erweitert.

Fachlicher Nutzen dieses Commits:

- Neuer Termin mit Sidebar-Drafts vor dem ersten Save
- sichtbare Sidebar bereits im Create-Modus

Technisches Risiko dieses Commits:

- Mehr State, mehr Re-Renders, mehr Overlay-/Dialog-Interaktion
- staerkerer Pfad in den fehlerhaften Create-Modus des `ProjectForm`

Kurzfazit:

- Wahrscheinlich kein primaerer Root Cause fuer das Zurueckspringen der Dropdowns.
- Sehr plausibler Trigger, warum das Problem gerade im Workflow `Neuer Termin -> Dok Extrakt -> Neues Projekt` sichtbar wurde.

### Kandidat 4: `5e2b7ca`

Commit:

- `5e2b7ca` `Fix extracted appointment attachment handoff to project`

Bewertung:

- Eher schwaecherer Kandidat

Warum dieser Commit relevant ist:

- Der Handoff extrahierter Termin-Attachments in das erzeugte Projekt wurde geaendert.
- `onProjectCreated` und Attachment-Signaturen wurden angepasst.

Warum er eher nicht Root Cause ist:

- Der Commit betrifft primär Attachments und Overlay-Rueckweg.
- Er aendert nicht den zentralen Create-Reset der Artikellisten-Selections.

Kurzfazit:

- Relevanter Nachbar-Commit im selben Flow, aber nur schwacher Verdaechtiger fuer dieses konkrete Dropdown-Symptom.

### Kandidat 5: `8e43665`

Commit:

- `8e43665` `fix: Auswahl in Artikelliste-Dropdowns zurücksetzen ermöglichen`

Bewertung:

- Plausibler Nebenkandidat, aber eher nicht Root Cause

Warum dieser Commit auffaellig ist:

- Er aendert die Handler fuer `selectedValue === ""`.
- Dadurch wurde explizites Abwaehlen ueber die leere Option eingefuehrt.

Warum er eher nicht der Kern des gemeldeten Fehlers ist:

- Dein Symptom ist nicht „ich waehle leer und es wird nicht gespeichert“.
- Dein Symptom ist „ich waehle etwas Konkretes und es springt sofort wieder zurueck“.
- Das spricht deutlich eher fuer einen nachgelagerten Reset-Effekt als fuer die Handler-Sonderbehandlung des Leerwerts.

Kurzfazit:

- Moeglicher Randverstaerker, aber nicht die wahrscheinlichste Einfuehrungsstelle.

## Wahrscheinlichste Root-Cause-These

Die staerkste technische These aus dieser Analyse lautet:

1. `a18ce68` hat durch frischer geladene Stammdaten die Wahrscheinlichkeit erhoeht, dass `dynamicCategorySlots` und verwandte Abhaengigkeiten im `ProjectForm` erneut ausgewertet werden.
2. Der bestehende Create-Initialisierungseffekt im `ProjectForm` war nicht ausreichend gegen wiederholtes Initialisieren geschuetzt.
3. Im Create-Modus wurden dadurch `productSelections` und `dynamicProductSelections` erneut auf leer gesetzt.
4. `95d9069` und `feca523` haben diesen fehleranfaelligen Pfad im Dok-Extrakt-/Termin-Overlay-Workflow noch staerker in den Vordergrund gebracht.

Diese These wird stark dadurch gestuetzt, dass der spaetere lokale Fix `a196394` das Problem genau ueber einen Guard in diesem Initialisierungseffekt stabilisiert hat.

## Warum `3894702` als Referenz plausibel ist

Die Nutzerbeobachtung:

- In `3894702` existiert das Problem nicht.

passt gut zur analysierten Historie:

- Die spaeteren Kandidaten `a18ce68`, `feca523`, `5e2b7ca` und `95d9069` liegen alle nach diesem Referenzstand.
- Insbesondere `a18ce68` und `95d9069` fuehren genau die Art von State-/Overlay-Aenderungen ein, die zu diesem Fehlerbild passen.

## Ergebnis

Die wahrscheinlichsten Kandidaten fuer das Einschleusen des Fehlers nach `3894702` sind:

1. `a18ce68` - hoechstwahrscheinlich primaere technische Ursache
2. `95d9069` - sehr wahrscheinlicher Verstaerker bzw. Sichtbarmacher im Dok-Extrakt-Overlay
3. `feca523` - plausibler Trigger im neuen Termin-Create-Flow

Eher nachrangig:

4. `5e2b7ca`
5. `8e43665`

## Hinweise fuer weitere Nachverfolgung

Wenn diese Analyse spaeter fuer Ticket, PR oder Root-Cause-Kommentar verwendet wird, ist die kompakteste belastbare Formulierung:

- Der Fehler wurde sehr wahrscheinlich durch die Kombination aus frischerem Masterdata-Refetch (`a18ce68`) und einem ungeschuetzten Create-Initialisierungseffekt im `ProjectForm` eingefuehrt.
- Die spaeteren Dok-Extract-/Overlay-Commits, insbesondere `95d9069`, haben den fehlerhaften Create-Pfad im Workflow `Neuer Termin -> Dok Extrakt -> Neues Projekt` reproduzierbar gemacht.

## Betroffene Dateien in der Analyse

- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`

## Keine zusaetzlichen Produktiv-Aenderungen in diesem Analyseauftrag

Dieses Log dokumentiert nur die commit-basierte Ursachenanalyse. Es fuehrt keine neue funktionale Aenderung ein.
