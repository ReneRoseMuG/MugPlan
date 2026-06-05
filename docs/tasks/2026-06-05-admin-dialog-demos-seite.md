# Codex-Auftrag: Admin-Seite Dialog-Demos implementieren

**Parent:** MS-54 — Demo Ansichten
**Datum:** 2026-06-05
**Aufgaben-ID:** TASK-225

---

## Ziel

Eine neue, ausschliesslich für Admins zugängliche Seite „Dialog-Demos" wird in den bestehenden
ViewType-/Sidebar-Mechanismus der App eingebaut. Die Seite zeigt alle Dialog-Komponenten aus
den Bereichen Tour/KW-Planung und Termin-Mutationen gruppiert, mit echten Daten und vollständig
bedienbar — inklusive Mehrschritt-Interaktion. Zusätzlich enthält die Seite einen
Design-System-Referenzbereich, der als verbindliche Quelle für einheitliche Button-Benennung,
Footer-Positionierung und Icon-Zuordnung dient.

---

## Hintergrund & Kontext

Im Zuge der Dialog-Konsistenz-Analyse wurde festgestellt, dass mehrere Dialog-Komponenten
strukturelle Unterschiede aufweisen (z. B. `AppointmentCancelConfirmDialog` nutzt rohes
`AlertDialog` ohne `bg-slate-50`-Header; `CalendarWeekNotesDialog` nutzt rohes `<Dialog>` ohne
`DialogBaseShell`). Diese Inkonsistenzen sind ohne eine zentrale Demo-Seite schwer zu erkennen
und zu beheben, weil jeder Dialog bisher nur im echten App-Kontext geöffnet werden kann.

Die App verwendet `ViewType` (Union-Type in `Home.tsx`) als zentralen Routing-Mechanismus.
Admin-Only-Seiten werden per `isAdmin`-Guard in Sidebar und Home-Render-Logic geschützt.
Bestehende Referenz: `masterData` und `users` (beide unter NavGroup „Konto", beide mit
`isAdmin`-Check in `Home.tsx` und `Sidebar.tsx`).

Basis-Dialog-Komponenten:
- `DialogBaseShell` — Hülle mit Header, Body, Footer; X-Button; bg-slate-50 Header/Footer
- `MutationPreviewDialogBase` — wraps `DialogBaseShell`; fügt optionalen Stepper, Summary, Error-Block hinzu
- `ConfirmDialogBase` — nutzt `AlertDialog`; Icon-Frame, Titel, Beschreibung, Abbrechen + Bestätigen
- `DialogBaseFooter` — `[← Zurück (ghost)] | [Abbrechen (outline)] [Primär (default)]`

---

## Aufgabe

### Schritt 1 — ViewType erweitern (`client/src/pages/Home.tsx`)

Füge `"dialogDemos"` zur `ViewType`-Union hinzu:

```ts
export type ViewType =
  | ...
  | "dialogDemos";
```

Füge im Render-Block (nach dem `users`-Case) hinzu:

```tsx
) : view === "dialogDemos" && isAdmin ? (
  <DialogDemosPage />
```

Import am Anfang der Datei ergänzen:

```ts
import { DialogDemosPage } from "@/components/DialogDemosPage";
```

### Schritt 2 — Sidebar-Eintrag (`client/src/components/Sidebar.tsx`)

Unter dem `isAdmin`-Block in NavGroup „Konto" einen weiteren NavButton ergänzen:

```tsx
{isAdmin ? (
  <>
    <NavButton icon={AdminIcon} label="Stammdaten" ... />
    <NavButton icon={AdminIcon} label="Benutzer" ... />
    <NavButton
      icon={FlaskConical}
      label="Dialog-Demos"
      testId="nav-dialog-demos"
      isActive={currentView === "dialogDemos"}
      onClick={() => onViewChange("dialogDemos")}
    />
  </>
) : null}
```

Import `FlaskConical` von lucide-react ergänzen (oder `LayoutTemplate` als Alternative).

### Schritt 3 — Neue Seite anlegen (`client/src/components/DialogDemosPage.tsx`)

Die Seite nutzt `ListLayout` als äussere Hülle (wie andere Admin-Seiten).

#### Daten laden

```ts
const { data: tours = [] } = useQuery<Tour[]>({ queryKey: ["/api/tours"] });
const { data: employees = [] } = useQuery({ queryKey: ["/api/employees"] });
```

Aus `employees` werden die ersten 2–3 Einträge für Demo-Previews verwendet.
Aus `tours` wird der erste Eintrag mit mindestens einer KW-Planung für Demo-Trigger verwendet.

#### Seitenstruktur

Die Seite besteht aus vier Sektionen, jeweils als `<section>` mit Überschrift und
Beschreibungstext:

**Sektion A — Basis-Komponenten**

Drei Demo-Kacheln (Card-Grid, 3 Spalten):

1. `DialogBaseShell` — Beschreibung der Props + Mini-Demo-Button (öffnet leeren Dialog)
2. `MutationPreviewDialogBase` — Beschreibung + Mini-Demo-Button (öffnet Dialog mit Stepper)
3. `ConfirmDialogBase` — Beschreibung + Mini-Demo-Button (öffnet Bestätigungs-Dialog)

Jede Kachel zeigt: Komponentenname als Code-Chip, kurze Beschreibung, gerenderten Button.

**Sektion B — Design-System Standards**

Statische Referenz-Karte mit vier Blöcken:

1. **Footer-Positionierung** — visuelle Darstellung:
   `[← Zurück (ghost, mr-auto)] | [Abbrechen (outline)] [Primär (default)]`
   Mit Notiz: „Zurück nur bei Mehrschritt-Dialogen; immer `variant='ghost'` mit ArrowLeft-Icon"

2. **Primär-Aktions-Benennung** — Tabelle:
   | Kontext | Button-Label |
   |---|---|
   | Kalender-Move (D&D/Insert) | Termin verschieben |
   | Tourwechsel im Formular | Tourwechsel bestätigen |
   | Termin speichern (letzter Schritt) | Termin speichern |
   | Termin speichern ohne Mitarbeiter | Trotzdem speichern |
   | Wochenplanung blockieren | Blockieren |
   | Mitarbeiter aufnehmen, Einzelschritt | Entscheidung bestätigen |
   | Mitarbeiter aufnehmen, letzter von n | Alle Entscheidungen bestätigen |
   | Ressourcen-Auswahl übernehmen | Auswahl übernehmen |
   | Termin stornieren | Termin stornieren |
   | Zwischen-Schritt (alle Mehrschritt-Dialoge) | Weiter |

3. **Töne / Alert-Styles** — vier `DialogBaseInlineMessage`-Instanzen nebeneinander:
   info, warning, error, success — jeweils mit Beispieltext

4. **Icon-Mapping** — Tabelle:
   | Icon | Verwendung |
   |---|---|
   | `Save` | Termin speichern (AppointmentSaveReviewDialog) |
   | `Route` | Wochenplanung blockieren (ConfirmDialogBase) |
   | `TriangleAlert` | Warnungen in Dialog-Inhaltsblöcken |
   | `CheckCircle2` | Bereits zugewiesene Mitarbeiter |
   | `ArrowLeft` | Zurück-Button in Mehrschritt-Dialogen |
   | `Loader2` | Pending-Zustand aller Primär-Buttons |

**Sektion C — Gruppe 1: Tour / KW-Planung**

Demo-Karten (jeweils als Card mit Breadcrumb, Bedingungen, Trigger):

1. **Wochenplanung blockieren** (`ConfirmDialogBase`)
   - Pfad: Sidebar → Touren → Tour bearbeiten → KW-Karte öffnen → „Blockieren" klicken
   - Bedingungen: KW nicht bereits blockiert, User ist ADMIN oder DISPATCHER
   - Demo-Trigger öffnet `ConfirmDialogBase` mit fixem Text

2. **Mitarbeiter in KW aufnehmen – Einzelschritt** (`TourEmployeeCascadeDialog`, variant=week)
   - Pfad: Sidebar → Touren → Tour bearbeiten → KW-Karte → Mitarbeiter-„+"-Button
   - Bedingungen: Mitarbeiter noch nicht in dieser KW eingeplant, KW nicht blockiert
   - Demo-Trigger: lädt Preview via `POST /api/tours/:id/week-employees/add/preview` mit
     dem ersten verfügbaren Tour/Mitarbeiter-Paar; öffnet echten Dialog
   - Fallback falls kein Tour-Datum verfügbar: Fixture-Preview mit realen Mitarbeiternamen

3. **Mitarbeiter in KW aufnehmen – Mehrschritt (2 MA)** (`TourEmployeeCascadeDialog`, variant=week)
   - Pfad: Wochenplanungs-Übersicht → Drag-&-Drop mehrerer Mitarbeiter in eine KW-Spalte
   - Bedingungen: Mindestens 2 Mitarbeiter gleichzeitig hinzugefügt, KW nicht blockiert
   - Demo-Trigger: Fixture-Preview für 2 Mitarbeiter (reale Namen aus API)

4. **Mitarbeiter aus KW entfernen** (`TourEmployeeCascadeDialog`, variant=week, mode=remove)
   - Pfad: Sidebar → Touren → Tour bearbeiten → KW-Karte → Mitarbeiter-„×"-Button
   - Bedingungen: Mitarbeiter ist in KW eingeplant, KW nicht blockiert
   - Demo-Trigger: Fixture-Preview mit realen Namen

5. **Fehlerfall partial_error** (`TourEmployeeCascadeDialog`, Mehrschritt mit Fehler)
   - Pfad: Wie Mehrschritt-Variante, ein Schritt schlägt beim Ausführen fehl
   - Demo-Trigger: Fixture-State mit `phase="partial_error"`, ein Schritt als error markiert

**Sektion D — Gruppe 2: Termin-Mutationen**

1. **Termin stornieren** (`AppointmentCancelConfirmDialog`)
   - Pfad: Termin öffnen → Aktionsmenü → „Stornieren"
   - Bedingungen: Termin nicht bereits storniert, User ist ADMIN oder DISPATCHER
   - Hinweis-Chip: „⚠ Inkonsistenz: Kein DialogBaseShell-Header" (orange Badge)
   - Demo-Trigger öffnet Dialog direkt

2. **Termin verschieben – mit Mitarbeiter-Warnung** (`AppointmentMoveDialog`, isCalendarMove=true)
   - Pfad: Wochenkalender → Termin per Drag-&-Drop auf andere Tour/Tag ziehen
   - Bedingungen: Ziel-Tour/Woche hat Konflikte mit bestehenden Mitarbeitern
   - Demo-Trigger: Fixture-Preview mit `will_remove`-Items, reale Mitarbeiternamen

3. **Termin verschieben – Wochenplanungs-Schritt** (`AppointmentMoveDialog`, isCalendarMove=true)
   - Pfad: Wie oben, nach Bestätigung der Warnung
   - Demo-Trigger: Fixture-Preview mit `will_add`-Items

4. **Tourwechsel** (`AppointmentMoveDialog`, isCalendarMove=false)
   - Pfad: Termin öffnen → Tour-Dropdown ändern → Speichern → Dialog erscheint
   - Bedingungen: Neue Tour hat andere KW-Mitarbeiter als bisherige Tour
   - Demo-Trigger: Fixture-Preview

5. **Termin speichern – Ressourcen-Schritt** (`AppointmentSaveReviewDialog`)
   - Pfad: Termin öffnen → Datum/Tour ändern → Speichern → Preview hat Entscheidungen
   - Bedingungen: `hasResourcePreviewDecision(preview) === true`
   - Demo-Trigger: Fixture-Preview mit gemischten Status-Werten

6. **Termin speichern – Notizen-Schritt** (`AppointmentSaveReviewDialog`)
   - Pfad: Termin mit Notizen öffnen → Datum oder Tour ändern → Speichern
   - Bedingungen: Termin hat Notizen UND Datum/Tour hat sich geändert
   - Demo-Trigger: Fixture-NoteReview mit 1–2 Beispielnotizen

7. **Termin speichern – Kein Mitarbeiter** (`AppointmentSaveReviewDialog`)
   - Pfad: Termin ohne Mitarbeiter speichern
   - Bedingungen: `resolvedEmployeeIds.length === 0`
   - Demo-Trigger: leere Mitarbeiterliste, keine Resource-/Note-Preview

8. **Ressourcenplanung im Terminformular** (`ResourcePlanningDialog`, variant=appointment)
   - Pfad: Termin öffnen → Mitarbeiter-„+"-Button klicken → Wochenplanung hat Vorschläge
   - Bedingungen: Tour hat KW-Mitarbeiter, `appointmentWeekPreviewDialog` öffnet sich
   - Hinweis-Chip: „⚠ Inkonsistenz: Kein Icon im Header"
   - Demo-Trigger: Fixture-Preview

9. **KW-Notizen** (`CalendarWeekNotesDialog`)
   - Pfad: Wochenkalender → KW-Header-Bar → Notizen-Icon klicken
   - Bedingungen: keine
   - Hinweis-Chip: „⚠ Inkonsistenz: Rohes Dialog ohne DialogBaseShell"
   - Demo-Trigger: öffnet Dialog mit erster verfügbarer Tour + aktueller KW

#### Demo-Karten-Format

Jede Demo-Karte hat folgende einheitliche Struktur:

```tsx
<DemoCard
  title="Termin verschieben"
  component="AppointmentMoveDialog"
  baseComponent="MutationPreviewDialogBase"
  inconsistencies={["Kein Icon im Header"]}  // optional
  path={[
    "Wochenkalender",
    "Termin per D&D auf andere Tour ziehen",
    "Preview-API-Call",
    "Dialog erscheint"
  ]}
  conditions={[
    "Ziel-Tour hat andere KW-Mitarbeiter",
    "Termin hat zugewiesene Mitarbeiter"
  ]}
>
  <Button onClick={() => setOpen(true)}>Demo öffnen</Button>
</DemoCard>
```

`DemoCard` ist eine neue kleine Hilfskomponente innerhalb der `DialogDemosPage.tsx`
(kein eigenes File nötig). Sie rendert eine Karte mit:
- Komponentenname als `code`-Badge
- Basis-Komponente als farbiger Chip (blau=DialogBaseShell, lila=MutationPreviewDialogBase,
  pink=ConfirmDialogBase, orange=roh)
- Breadcrumb-Pfad als nummerierte Liste
- Bedingungen als Chip-Liste
- Inkonsistenz-Warnung falls vorhanden (amber Badge)
- Slot für den Trigger-Button

---

## Technische Leitplanken

- Kein neuer API-Endpunkt, kein Backend-Code
- `onConfirm`-Callbacks in Demo-Kontext: `() => setOpenX(false)` — keine echte Mutation
- Für Preview-API-Calls (TourEmployeeCascadeDialog Demo) gilt: nur der Preview-Endpunkt wird
  aufgerufen (POST preview = lesend), kein Execute-Aufruf
- Die echten Dialog-Komponenten werden 1:1 importiert und unverändert genutzt
- Kein `drizzle-kit`, kein Schema, keine Migration
- Datum-Anzeige in Demo-Texten: `dd.MM.yy` (CLAUDE.md §9)
- Alle deutschen Texte mit echten Umlauten

---

## Regeln & Randfälle

- Falls `tours` leer ist (keine Tour im System), zeigt jede Demo-Karte einen Hinweis
  „Keine Touren im System — Demo benötigt mindestens eine Tour" statt des Trigger-Buttons
- Falls `employees` leer ist, analog
- Demo-Dialoge führen keine echten Mutationen aus — `onConfirm` schließt nur den Dialog
- Mehrschritt-Demo-Dialoge (TourEmployeeCascadeDialog mit 2 Mitarbeitern) nutzen
  lokalen State in der Demo-Karte für die Schritt-Auswahl, nicht den echten Cascade-Flow
- Die `CalendarWeekNotesDialog`-Demo öffnet echte Notizen der aktuellen KW (read-only=false
  ist zulässig, weil der Dialog selbst die Mutations intern handled)

---

## Abnahmekriterien

1. NavButton „Dialog-Demos" erscheint in der Sidebar nur wenn `userRole === "ADMIN"`
2. Klick öffnet die Seite im Haupt-Panel (gleiche Struktur wie `MasterDataPage`)
3. Alle 4 Sektionen sind sichtbar (Basis-Komponenten, Design-System, Tour/KW, Termin)
4. Jede Demo-Karte zeigt: Komponentenname, Basis-Komponente, Breadcrumb-Pfad, Bedingungen
5. Karten mit bekannten Inkonsistenzen tragen einen sichtbaren Amber-Hinweis-Chip
6. Alle Trigger-Buttons öffnen den jeweiligen echten Dialog
7. Mehrschritt-Dialoge (AppointmentMoveDialog mit warn+select, TourEmployeeCascadeDialog
   Mehrschritt) sind vollständig bedienbar (Weiter/Zurück funktioniert)
8. `onConfirm` in allen Demo-Dialogen schließt nur den Dialog, löst keine echte Mutation aus
9. Design-System-Tabellen sind vollständig (alle 10 Aktions-Benennungen, alle 6 Icons)
10. Seite ist für Nicht-Admins komplett unsichtbar (kein NavButton, kein direkter URL-Zugriff)
