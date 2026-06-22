import { getTableColumns, sql, type SQL } from "drizzle-orm";
import { customers } from "@shared/schema";

/**
 * Zentrale serverseitige Auflösung der WIRKSAMEN LIEFERADRESSE je Kunde (MS-68, FT 09).
 *
 * Regel: Existiert eine als Lieferadresse (Kategorie roleKey=DELIVERY) bestimmte Adresse,
 * ist diese die wirksame Lieferadresse; andernfalls gilt die Rechnungsadresse
 * (Kategorie roleKey=BILLING) als wirksame Lieferadresse (Fallback für den Normalfall
 * "Liefer- = Rechnungsadresse").
 *
 * Umsetzung als KORRELIERTE Unterabfrage je Adressfeld statt DB-Sicht oder zusätzlichem Join:
 * - Test-DBs werden im Projekt per Schema-Klon bereitgestellt (keine Sicht-Bereitstellung).
 * - Selbstständige Spaltenausdrücke lassen sich an allen bestehenden Projektionen
 *   (Termine, Sidebar, Reports, Board, Export) einsetzen, ohne deren Join-Struktur zu
 *   ändern und ohne die DTO-Feldnamen anzutasten. Alle Konsumenten lesen unverändert weiter.
 *
 * Voraussetzung: Die Auflösung korreliert auf die Spalte `customers.id` der jeweiligen
 * äußeren Abfrage. Die einbettenden Abfragen joinen die Basistabelle `customer` ohne Alias
 * (wie projektweit gängig).
 */

const ADDRESS_COLUMN_NAMES = {
  addressLine1: "address_line1",
  addressLine2: "address_line2",
  postalCode: "postal_code",
  city: "city",
  country: "country",
} as const;

type EffectiveAddressField = keyof typeof ADDRESS_COLUMN_NAMES;

/**
 * Korrelierte Unterabfrage, die für den Kunden der äußeren Abfrage (`customers.id`) den Wert
 * des angeforderten Adressfeldes der wirksamen Lieferadresse liefert. Bevorzugt die
 * Lieferadresse (DELIVERY), sonst die Rechnungsadresse (BILLING).
 */
export function effectiveDeliveryAddressColumn(field: EffectiveAddressField): SQL<string | null> {
  const dbColumn = ADDRESS_COLUMN_NAMES[field];
  // Korrelation auf die Basistabelle `customer` (ohne Alias) der äußeren Abfrage: literaler
  // Bezug customer.id, da eingebettete Spaltenreferenzen in der Unterabfrage ohne
  // Tabellenpräfix rendern und dort mehrdeutig wären.
  return sql<string | null>`(
    SELECT eff_ca.${sql.raw(dbColumn)}
    FROM customer_address eff_ca
    INNER JOIN address_category eff_ac
      ON eff_ac.id = eff_ca.category_id AND eff_ac.role_key IN ('DELIVERY', 'BILLING')
    WHERE eff_ca.customer_id = customer.id
    ORDER BY CASE eff_ac.role_key WHEN 'DELIVERY' THEN 0 ELSE 1 END
    LIMIT 1
  )`;
}

/**
 * Liefert 1, wenn der Kunde der äußeren Abfrage eine eigene (abweichende) Lieferadresse
 * besitzt, sonst 0 (dann greift der Rechnungsadress-Fallback).
 */
export function hasDeliveryAddressColumn(): SQL<number> {
  return sql<number>`(
    SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
    FROM customer_address eff_ca
    INNER JOIN address_category eff_ac
      ON eff_ac.id = eff_ca.category_id AND eff_ac.role_key = 'DELIVERY'
    WHERE eff_ca.customer_id = customer.id
  )`;
}

/**
 * Select-Objekt der vollständigen Kundenrelation, bei dem die fünf sichtbaren Adressfelder
 * (addressLine1/2, postalCode, city, country) auf die WIRKSAME LIEFERADRESSE umgeleitet sind.
 * Alle weiteren Kundenfelder (inkl. der Kunden-`version` für Optimistic Locking) bleiben
 * unberührt. Damit zeigen alle Projektionen, die bisher `customer: customers` selektierten,
 * transparent die wirksame Lieferadresse, ohne Änderung der nachgelagerten Mappings.
 */
export function customerSelectWithEffectiveAddress() {
  return {
    ...getTableColumns(customers),
    addressLine1: effectiveDeliveryAddressColumn("addressLine1"),
    addressLine2: effectiveDeliveryAddressColumn("addressLine2"),
    postalCode: effectiveDeliveryAddressColumn("postalCode"),
    city: effectiveDeliveryAddressColumn("city"),
    country: effectiveDeliveryAddressColumn("country"),
  };
}
