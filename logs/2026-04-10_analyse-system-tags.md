# Analyse-Session: System-Tags und Schutzmechanismen

**Datum:** 2026-04-10
**Auftragsklasse:** 1 – Reine Frage / Leseauftrag (kein Code geändert)
**Branch:** feature/tour-kw-employee-planning (unverändert)

---

## Zweck dieser Session

Analyse und Klärung des System-Tag-Mechanismus in MuGPlan:
- Welcher Service stellt System-Tags sicher?
- Wann und wie werden sie erzeugt?
- Welche Zwecke erfüllen die einzelnen Konstanten?
- Sind die Konstantennamen konsistent und verständlich?
- Warum zeigt die UI nur 3 von 5 verwalteten Tags als „System-Tag" an?

---

## Besprochene Dateien

| Datei | Rolle |
|---|---|
| `shared/appointmentCancellation.ts` | Zentrale Definitionen: Konstantennamen, Farben, Erkennungsfunktionen |
| `server/services/seedTagsService.ts` | Seed-Import/-Export mit `ensureManagedSystemTags()` |
| `server/services/masterDataService.ts` | `ensureProtectedTagDefaults()`, aufgerufen bei `listTags()` und `createTag()` |
| `server/services/tagRelationsService.ts` | `ensureAppointmentCancellationTag()` etc., aufgerufen beim Tag-Katalog-Abruf |
| `server/lib/appointmentCancellation.ts` | Wrapper-Funktionen: `isManagedReportExclusionTag`, `hasManagedReportExclusionTag` usw. |
| `server/repositories/masterDataRepository.ts` | `ensureTagDefinition()` – idempotentes INSERT-or-update |
| `server/repositories/reportsRepository.ts` | Auswertung von `hasReportExclusion`, `specialMeasureTag`, `remarksTag` |
| `server/lib/reportProduktionsplanung.ts` | Filterlogik: Ausschluss von Reklamation + Storniert aus Kartengruenden |
| `client/src/components/TagManagementPage.tsx` | UI-Logik: `isProtectedSystemTag` prüft nur `tag.isDefault` |

---

## Ergebnis 1: Wer stellt System-Tags sicher?

System-Tags werden **nicht beim Server-Start**, sondern **on-demand** angelegt – an drei Stellen:

1. **`masterDataService.ensureProtectedTagDefaults()`** – wird bei jedem `listTags()` und `createTag()` aufgerufen.
2. **`seedTagsService.ensureManagedSystemTags()`** – wird bei `applyTagsSeed()` und `exportTagsSeed()` aufgerufen.
3. **`tagRelationsService`** – ruft `ensureAppointmentCancellationTag()`, `ensureManagedReportExclusionTag()`, `ensureManagedSpecialMeasureTag()` beim Tag-Katalog-Abruf auf.

Alle drei Pfade nutzen `masterDataRepository.ensureTagDefinition()` als idempotente Basis (INSERT-or-skip/update).

**Auffälligkeit:** `MANAGED_MESSE_TAG_NAME` und `MANAGED_REMARKS_TAG_NAME` werden in keinem dieser Pfade mit `ensureTagDefinition` angelegt – sie existieren in der DB nur, wenn sie manuell oder per Seed angelegt wurden.

---

## Ergebnis 2: Zweck der Konstanten

| Konstante | DB-Wert | Fachliche Bedeutung | Wirkung |
|---|---|---|---|
| `RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME` | "Storniert" | Stornierter Termin | Ausschluss aus allen Reports; im Picker **nicht sichtbar** (hard blocked) |
| `MANAGED_REPORT_EXCLUSION_TAG_NAME` | "Reklamation" | Reklamationstermin/-projekt | Ausschluss aus Produktionsplanung + Vorlaufliste; **sichtbar** im Tourenplan (höchste Priorität) und in der Auftragsliste |
| `MANAGED_SPECIAL_MEASURE_TAG_NAME` | "Sondermaß" | Sondermaßnahme | Erscheint als Kartengrund in Produktionsplanung; Tourenplan-Priorität Stufe 2 |
| `MANAGED_MESSE_TAG_NAME` | "Messe Aufbau/Abbau" | Messeaufbau/-abbau | Tourenplan-Priorität Stufe 3 |
| `MANAGED_REMARKS_TAG_NAME` | "Anmerkungen" | Freie Anmerkung | Erscheint als Kartengrund in Produktionsplanung |

---

## Ergebnis 3: Inkonsistenz im Konstantennamen

`MANAGED_REPORT_EXCLUSION_TAG_NAME` ist der einzige Konstantenname, dessen Mittelteil einen **technischen Effekt** (`REPORT_EXCLUSION`) statt eine **fachliche Rolle** (`REKLAMATION`) beschreibt.

Alle anderen Konstanten folgen dem Schema `{SCOPE}_{FACHLICHE_ROLLE}_TAG_NAME`.

**Vorschlag:** Umbenennen in `MANAGED_COMPLAINT_TAG_NAME` (analog zu den anderen).

Damit verbunden wären rein mechanische Umbenennungen ohne fachliches Risiko:
- `isManagedReportExclusionTagName` → `isManagedComplaintTagName`
- `isManagedReportExclusionTag` → `isManagedComplaintTag`
- `hasManagedReportExclusionTag` → `hasManagedComplaintTag`
- Feld `hasReportExclusion` in `reportsRepository.ts`

Der **DB-Wert "Reklamation" bleibt unverändert** – kein Datenbankrisiko.

**Noch nicht entschieden / noch nicht beauftragt.**

---

## Ergebnis 4: Zwei verschiedene Schutzmechanismen – Inkonsistenz

Die UI ([`TagManagementPage.tsx:39`](../client/src/components/TagManagementPage.tsx#L39)) prüft ausschließlich `tag.isDefault` aus der DB:

```ts
function isProtectedSystemTag(tag: Pick<Tag, "isDefault">): boolean {
  return Boolean(tag.isDefault);
}
```

Der serverseitige Schutz (`isProtectedSystemTagName`) prüft den Tag-Namen per Stringvergleich.

**Ergebnis:**

| Tag | `isDefault` in DB | in `isProtectedSystemTagName` | UI zeigt „System-Tag" | Löschbar im Admin |
|---|:---:|:---:|:---:|:---:|
| Storniert | ✓ | ✓ | ✓ | Nein |
| Reklamation | ✓ | ✓ | ✓ | Nein |
| Sondermaß | ✓ | ✓ | ✓ | Nein |
| **Messe Aufbau/Abbau** | **✗** | **✓** | **✗** | **Ja ⚠️** |
| **Anmerkungen** | **✗** | **✗** | **✗** | **Ja ⚠️** |

**Risiken:**
- „Messe Aufbau/Abbau" kann im Admin gelöscht/umbenannt werden → Tourenplan-Priorität Stufe 3 bricht still.
- „Anmerkungen" ist überhaupt nicht geschützt → Produktionsplanung-Kartengründe bricht still, wenn der Tag entfernt wird.

**Noch nicht beauftragt, nur dokumentiert.**

---

## Ergebnis 5: „Vakant"-Tag

Aktuell existiert „Vakant" nicht im Code. Vor einer Einführung sind folgende Fragen zu klären:

- Soll der Tag durch den User setzbar sein (`MANAGED_`) oder systemseitig gesetzt (`RESERVED_`)?
- Welche Reports sollen ihn ausschließen oder einschließen?
- Soll er im Picker sichtbar sein?

Ohne diese Klärung wurde kein Code angelegt.

---

## Offene Punkte / Handlungsbedarf

1. **Konstantenname `MANAGED_REPORT_EXCLUSION_TAG_NAME`** umbenennen – niedrige Priorität, kein fachliches Risiko, aber sinnvoll für Lesbarkeit.
2. **`MANAGED_MESSE_TAG_NAME`** mit `isDefault: true` in DB sichern und in `ensureManagedSystemTags` aufnehmen – sonst löschbar.
3. **`MANAGED_REMARKS_TAG_NAME`** in `isProtectedSystemTagName` aufnehmen und ebenfalls mit `isDefault: true` sichern – derzeit vollständig ungeschützt.
4. **„Vakant"-Tag** – bei Bedarf neu beauftragen nach fachlicher Klärung.

---

## Änderungen in dieser Session

Keine. Reine Analyse- und Leseauftrag-Session.
