# Projekte- und Dokumentextraktion-Dialoge

Dialog-, Bestätigungs- und Meldungspfade für Projektbearbeitung, Projektdubletten, projektbezogene Anhänge und Dokumentextraktion einheitlich strukturieren. Der Schwerpunkt liegt auf einem konsolidierten Projekt-Speichern-Flow, der mehrere Hinweise und Entscheidungen in einem Dialog bündelt, sowie auf einer besseren Weiterarbeit mit dem per Dokumentextraktion eingelesenen PDF.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Projektbearbeitung, Projektdubletten, projektbezogene Anhänge und Dokumentextraktion einheitlich strukturieren. Beim Speichern eines Projekts sollen mehrere fachliche Hinweise und Entscheidungen nicht mehr als getrennte Browser- oder Einzel-Dialoge erscheinen, sondern bei Bedarf in einem gemeinsamen Speichern-Dialog abgearbeitet werden.

## Ausgangslage

Im Projektformular existieren mehrere voneinander getrennte Dialog- und Confirm-Pfade: Projektnamenübernahme beim Sauna-Modell, Reklamationsnotiz-Vorschlag, Duplikatentscheidung für das extrahierte PDF und Hinweise rund um die strukturierte Artikelliste. Zusätzlich endet der Dokumentextraktionsfluss nach der Datenübernahme im neuen Projektformular, während das ursprüngliche PDF für die manuelle Prüfung bislang nicht gezielt aus diesem Formular heraus geöffnet werden kann.

## Umfang

- Beim Speichern eines Projekts soll vor der Mutation geprüft werden, ob in der Artikelliste sichtbare Einträge mit dem Zustand "Nicht ausgewählt" vorhanden sind.
- Diese offenen Artikellisten-Auswahlen sollen als nicht blockierender Hinweis im Speichern-Dialog zusammengefasst werden.
- Wenn ein Sauna-Modell gewählt ist und der Projektname davon abweicht, soll die Entscheidung zur Projektnamenübernahme im Speichern-Dialog getroffen werden.
- Der bisherige native Browser-Confirm beim Sauna-Modell-Wechsel soll entfallen.
- Wenn der Reklamationsworkflow im Create-Speichern-Flow aktiv ist, soll eine Reklamationsnotiz entweder wie bisher als normaler Notizeditor angeboten werden, falls sonst kein Speichern-Dialog nötig ist, oder als eigener Step im Speichern-Dialog erscheinen.
- Wenn beim Speichern eines per Dokumentextraktion erzeugten Projekts eine Duplikatentscheidung für das PDF-Attachment nötig ist, soll diese Entscheidung ebenfalls im Speichern-Dialog erfolgen.
- Das per Dokumentextraktion eingelesene PDF soll im Projektformular als Draft-Dokument sichtbar bleiben und bewusst in einem neuen Browser-Tab geöffnet werden können.
- Doppelte Dialoge für denselben Speichern-Vorgang sind ausdrücklich zu vermeiden.
- Abbruchpfade müssen verhindern, dass eine teilweise bestätigte Dialogkette unbeabsichtigt speichert.
- Nicht Teil der Aufgabe ist eine Änderung der Projekt-, Notiz-, Attachment- oder Auftragspositions-API-Contracts.
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition der Artikellisten-Datenstruktur oder der Produkt- und Komponentenverwaltung.

## Umsetzungshinweise

- `client/src/components/DocumentExtractionDialog.tsx`
- `client/src/components/ProjectDuplicateResolutionDialog.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/ProjectAppointmentsPanel.tsx`
- `client/src/components/ProjectAttachmentsPanel.tsx`
- `client/src/components/LinkedProjectsPanel.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/filters/project-article-filter-input.tsx`
- Die zentrale Orchestrierung soll in `ProjectForm` bleiben, weil dort Projektmutation, Artikelliste, Reklamations-Draft, Notizen, Anhänge und Dokumentextraktionsdatei zusammenlaufen.
- Gemeinsame Dialogbausteine aus `client/src/components/ui/dialog-base.tsx` sollen verwendet werden; native Browser-Confirm-Pfade im betroffenen Speichern-Flow sollen nicht erhalten bleiben.
- Reine Entscheidungs- und Prüfungslogik soll testbar aus der UI-Komponente herausgezogen werden.
- Die vorhandenen Server-Endpunkte für Projekt, Reklamation, Notizen, Attachments und Dokumentextraktion bleiben die fachliche Wahrheit.
- Zulässige Rollen sind `ADMIN` und `DISPATCHER` im Client beziehungsweise `ADMIN` und `DISPONENT` serverseitig für Mutationen; `READER` beziehungsweise `LESER` bleibt lesend.
- Eine reine UI-Ausblendung darf nicht als Berechtigungsdurchsetzung gewertet werden; bestehende serverseitige Guards müssen unverändert greifen.
- Tests sollen die reine Speichern-Review-Logik, die Dialogdarstellung, die Projektformular-Verdrahtung und die geänderten Browser-E2E-Erwartungen für den entfallenden Sauna-Browserdialog abdecken.

## Abschluss

- Abschlussdatum: 13.05.26
- Ergebnis: Der Projekt-Speichern-Flow nutzt den gemeinsamen `ProjectSaveReviewDialog`; Dokumentextraktions-PDFs bleiben als Draft sichtbar und können aus dem Formular geöffnet werden.
- Die fachliche Nachschärfung aus [Doc Extract und Projekt-Speichern-Flow überarbeiten](doc-extract-und-projekt-speichern-flow-ueberarbeiten.md) wurde im Doc-Extract-, Projekt- und Termin-Save-Flow umgesetzt.
- Verbleibende rote Gesamtlauf-Tests aus dem Journal vom 13.05.26 werden nicht als P-01-Restaufgabe geführt, sondern bei den passenden P-02-Testaufgaben weiterverfolgt.

## Blocker und offene Fragen

Keine bekannt.

---

## Beziehungen

- Features: [FT-02 - Projekte](../../features/ft-02-projekte/ft-02-projekte.md) · [FT-21 - Dokumentenextraktion](../../features/ft-21-dokumentenextraktion/ft-21-dokumentenextraktion.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Projekt-Speichern-Dialog für Artikellistenprüfung und Saunatitel](projekt-speichern-dialog-artikelliste-saunatitel.md) · [Doc Extract und Projekt-Speichern-Flow überarbeiten](doc-extract-und-projekt-speichern-flow-ueberarbeiten.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [10.05.26 - Projekt-Speichern-Dialog und Reportkarten-Nacharbeit](../../journal/10-05-26-projekt-speichern-und-reportkarten-nacharbeit.md) · [13.05.26 - Doc Extract, Projekt- und Termin-Save-Flow](../../journal/13-05-26-doc-extract-projekt-termin-save-flow.md)
