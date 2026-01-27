# FT 09 - Kundenverwaltung Implementation Log

**Datum:** 27.01.2026  
**Feature:** Kundenverwaltung (CRUD)  
**Status:** Implementiert

---

## Zusammenfassung

Die Kundenverwaltung wurde vollständig implementiert mit:
- PostgreSQL-Datenbank-Integration
- CRUD-Funktionalität (Create, Read, Update)
- Soft-Delete via `is_active` Flag (kein Hard-Delete)
- API-Endpunkte mit Validierung
- React-Frontend mit echten Daten

---

## Datenbankschema

### Customer Tabelle

```sql
CREATE TABLE customer (
  id BIGSERIAL PRIMARY KEY,
  customer_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Drizzle Schema (shared/schema.ts)

```typescript
export const customers = pgTable("customer", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  postalCode: text("postal_code"),
  city: text("city"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/customers` | Liste aller aktiven Kunden |
| GET | `/api/customers/:id` | Einzelner Kunde nach ID |
| POST | `/api/customers` | Neuen Kunden anlegen |
| PATCH | `/api/customers/:id` | Kundendaten aktualisieren |

### Request/Response Beispiele

**POST /api/customers**
```json
{
  "customerNumber": "K-2026-0001",
  "name": "Müller GmbH",
  "phone": "+49 123 456789",
  "addressLine1": "Industriestraße 42",
  "postalCode": "80331",
  "city": "München"
}
```

**Response:**
```json
{
  "id": 1,
  "customerNumber": "K-2026-0001",
  "name": "Müller GmbH",
  "phone": "+49 123 456789",
  "addressLine1": "Industriestraße 42",
  "addressLine2": null,
  "postalCode": "80331",
  "city": "München",
  "isActive": true,
  "createdAt": "2026-01-27T14:00:00.000Z",
  "updatedAt": "2026-01-27T14:00:00.000Z"
}
```

---

## Geänderte Dateien

### Backend

1. **shared/schema.ts**
   - `customers` Tabelle hinzugefügt
   - Insert-Schema und Typen definiert

2. **shared/routes.ts**
   - Zod-Schemas für API-Validierung
   - Request/Response-Typdefinitionen

3. **server/storage.ts**
   - IStorage-Interface erweitert
   - Repository-Methoden implementiert:
     - `listCustomers()`
     - `getCustomer(id)`
     - `createCustomer(data)`
     - `updateCustomer(id, data)`

4. **server/routes.ts**
   - Express-Routen registriert
   - Eingabevalidierung mit Zod

### Frontend

1. **client/src/components/CustomerList.tsx**
   - Echte Daten via useQuery
   - Projekt-Zähler entfernt
   - X-Button im Header entfernt
   - Ladeindikator hinzugefügt
   - Click-Handler für Kundenauswahl

2. **client/src/components/CustomerData.tsx**
   - Create/Edit-Modi implementiert
   - API-Integration mit useMutation
   - Status-Checkbox als read-only (disabled)
   - Formularvalidierung für Pflichtfelder
   - Demo-Daten für Projekte/Termine als Platzhalter

3. **client/src/pages/Home.tsx**
   - selectedCustomerId State
   - Navigation zwischen CustomerList und CustomerData
   - Props für Kundenauswahl

---

## Design-Entscheidungen

### Soft-Delete
- Kein Hard-Delete implementiert
- `is_active` Flag steuert Sichtbarkeit
- Gelöschte Kunden bleiben in DB erhalten

### Status-Checkbox
- Im Edit-Modus disabled/read-only
- Nur zur Anzeige des aktuellen Status
- Keine direkte Änderung möglich

### Pflichtfelder
- Kundennummer (eindeutig)
- Name
- Telefon

### Demo-Daten
- Projekte, Termine und Notizen zeigen weiterhin Platzhalter-Daten
- Werden in späteren Features mit echten Daten verbunden

---

## Repository-Pattern

Die Implementierung folgt dem Repository-Pattern:

```
API-Route → Storage-Interface → Datenbank
```

Alle CRUD-Operationen gehen durch das `IStorage`-Interface, was:
- Einheitliche Datenzugriffsmethoden bietet
- Testbarkeit verbessert
- Trennung von Concerns gewährleistet

---

## Validierung

### Backend (Zod)
- customerNumber: string, required
- name: string, required
- phone: string, required
- Optional: addressLine1, addressLine2, postalCode, city

### Frontend
- Pflichtfeld-Prüfung vor Submit
- Toast-Meldungen bei Fehlern
- Loading-States während API-Calls

---

## Nächste Schritte (Future Work)

1. Projekte mit Kunden verknüpfen
2. Termine mit Kunden verknüpfen
3. Notizen-System implementieren
4. Soft-Delete Toggle in UI
5. Such-/Filterfunktion in Kundenliste
