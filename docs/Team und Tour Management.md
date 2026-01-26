**Das Implementation Log**
Enthält Informationen über die erste Iteration zu diesem Thema

**Was wurde implementiert:**

- ✅ Datenbank-Tabelle `tours` (id, name, color)
- ✅ API-Endpunkte (GET, POST, PATCH, DELETE)
- ✅ Frontend-Anbindung mit reaktiver Datenaktualisierung
- ✅ Name-Feld als ReadOnly-Label (automatische Benennung)
- ✅ Farbe editierbar mit Color-Picker
- ✅ Guardrails in replit.md verlinkt

**Automatische Benennung:**

Neue Touren werden basierend auf `max(id) + 1` benannt, sodass nach Löschungen keine Duplikate entstehen.

**Tour SQL Schema laut Projektplan**

`CREATE TABLE IF NOT EXISTS tour (`
`id          BIGSERIAL PRIMARY KEY,`
`name        TEXT NOT NULL,`
`color       TEXT NOT NULL,`
`description TEXT NULL,`
`created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),`
`updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()`
`);`

**Team SQL Schema laut Projektplan**
`CREATE TABLE IF NOT EXISTS team (`
`id         BIGSERIAL PRIMARY KEY,`
`name       TEXT NOT NULL,`
`description TEXT NULL,`
`is_active  BOOLEAN NOT NULL DEFAULT TRUE,`
`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),`
`updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
`);`

Achtung: Umbennnen Team Vorlage in Team!

**Einheitliches Design und Funktionalität für Team Management und Tour Management**

Orientiere Dich am vorhandenen Team Management. Vereinheitliche das Aussehen der Tour Verwaltung. Die Team Verwaltung
bleibt Demo. Die Tourverwaltung wird implementiert. Die Darstellung einer Tour soll identisch zur Darstellung eines Teams sein
Zusätzlich soll das Tour Kärtchen am unteren Rand einen Button zur Farbwahl bekommen, der sich über die Breite der Karte erstreckt.
Beide Team und Tour Karte haben die Mitarbeiterliste als zentrales Element. Beide Kärtchen benötigen einen Edit Button, der es ermöglicht, die Mitarbeiterliste zu editieren. Die tatsächlichen Relationen zwischen Mitarbeiter, Tour und Team werden später über FK Relationen am employee Objekt umgesetzt.
