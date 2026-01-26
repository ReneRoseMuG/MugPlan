# FT_5 - Team und Tour Management Implementation Log

## Ausgangslage (Erste Iteration)

### Was bereits implementiert war:
- ✅ Datenbank-Tabelle `tours` (id, name, color)
- ✅ API-Endpunkte (GET, POST, PATCH, DELETE)
- ✅ Frontend-Anbindung mit reaktiver Datenaktualisierung
- ✅ Name-Feld als ReadOnly-Label (automatische Benennung)
- ✅ Farbe editierbar mit Color-Picker
- ✅ Guardrails in replit.md verlinkt

### Automatische Benennung:
Neue Touren werden basierend auf `max(id) + 1` benannt, sodass nach Löschungen keine Duplikate entstehen.

---

## Anforderungen aus der ersten Iteration

1. **Umbenennung**: "Team Vorlagen" → "Teams"
2. **Einheitliches Design**: Tour-Verwaltung soll identisch zur Team-Verwaltung aussehen
3. **Tour-Karte**: Color-Picker als Button über volle Breite am unteren Rand
4. **Mitarbeiterliste**: Zentrales Element auf beiden Karten
5. **Edit-Button**: Für Mitarbeiterliste auf Team- und Tour-Karten
6. **FK-Relationen**: Werden später am Employee-Objekt umgesetzt

---

## Durchgeführte Änderungen (Januar 2026)

### 1. Navigation angepasst
- **Sidebar.tsx**: "Team Vorlagen" → "Teams" umbenannt
- **Sidebar.tsx**: "Abwesenheiten" aus Navigation entfernt
- Nicht mehr benötigter Import (CalendarOff) entfernt

### 2. TeamManagement.tsx überarbeitet
- Titel von "Team Vorlagen" auf "Teams" geändert
- Edit-Button (Pencil Icon) zur TeamCard hinzugefügt
- **EditTeamMembersDialog** implementiert:
  - Öffnet sich beim Klick auf Edit-Button
  - Checkbox-Auswahl für Mitarbeiter
  - Bereits zugewiesene Mitarbeiter (in anderen Teams) ausgegraut
  - Speichern-Button aktualisiert Mitarbeiterliste

### 3. TourManagement.tsx komplett redesigned
- **TourCard** nach TeamCard-Vorbild umstrukturiert:
  - Header mit Tourfarbe + Name + Delete-Button
  - Weißer Content-Bereich darunter
  - Mitarbeiterliste mit UserCheck Icons als zentrales Element
  - Color-Picker als Button über volle Breite am unteren Rand
- Edit-Button (Pencil Icon) hinzugefügt
- **EditTourMembersDialog** implementiert:
  - Gleiche Logik wie EditTeamMembersDialog
  - Checkbox-Auswahl für Mitarbeiter
  - Bereits zugewiesene Mitarbeiter (in anderen Touren) ausgegraut
- **Demo-Daten** für Mitarbeiter (5 Beispiel-Mitarbeiter)
- Tour-Mitarbeiter werden im lokalen State verwaltet (tourMembers Record)

### 4. Dokumentation aktualisiert
- **replit.md**: Team- und Tour-Management Abschnitte aktualisiert

---

## Technische Details

### Geänderte Dateien:
| Datei | Änderung |
|-------|----------|
| `client/src/components/Sidebar.tsx` | Navigation angepasst |
| `client/src/components/TeamManagement.tsx` | Titel + EditDialog hinzugefügt |
| `client/src/components/TourManagement.tsx` | Komplettes Redesign |
| `replit.md` | Dokumentation aktualisiert |

### Neue Komponenten:
- `EditTeamMembersDialog` in TeamManagement.tsx
- `EditTourMembersDialog` in TourManagement.tsx

### SQL Schemas (für spätere DB-Integration):

**Tour:**
```sql
CREATE TABLE IF NOT EXISTS tour (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  description TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Team:**
```sql
CREATE TABLE IF NOT EXISTS team (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Offene Punkte für zukünftige Iterationen

- [ ] FK-Relationen zwischen Employee, Tour und Team implementieren
- [ ] Team-Verwaltung mit Datenbank verbinden (aktuell nur Demo)
- [ ] Tour-Mitarbeiterzuweisungen persistieren
- [ ] Team-Tabelle in Datenbank anlegen

---

## Status: ✅ Abgeschlossen

Alle Anforderungen aus der ersten Iteration wurden umgesetzt.
