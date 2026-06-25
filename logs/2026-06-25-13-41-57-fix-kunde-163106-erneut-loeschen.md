# Log: Kunde 163106 erneut loeschen

**Datum:** 25.06.26
**Uhrzeit:** 13:41:57
**Schritt:** Fix — Kunde 163106 erneut loeschen
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Kunde mit Kundennummer `163106` wurde erneut in der Development-Datenbank `mugplan_dev` ueber das vorhandene Skript `script/delete-dev-customer.ts` geloescht. Die Vorschau identifizierte diesmal Kundennummer `163106` mit interner ID `2076`. Der bestaetigte Lauf entfernte den Kunden sowie die vom Skript ermittelten abhaengigen Projekt-, Termin-, Auftrags-, Tag-, Anhang- und Terminmitarbeiterdaten. Anschliessend wurde die Vorschau erneut ausgefuehrt; sie fand keinen Kunden mit Kundennummer `163106` mehr. Eine Schemaaenderung oder Migration war nicht erforderlich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `mugplan_dev.customer` | geändert | Kunde `163106` / ID `2076` geloescht |
| `mugplan_dev.project` | geändert | 1 abhaengiges Projekt geloescht |
| `mugplan_dev.appointments` | geändert | 1 abhaengiger Termin geloescht |
| `mugplan_dev.project_order` | geändert | 1 abhaengiger Projekt-Auftrag geloescht |
| `mugplan_dev.project_order_items` | geändert | 8 abhaengige Auftragspositionen geloescht |
| `mugplan_dev.project_tags` | geändert | 1 Projekt-Tag-Verknuepfung geloescht |
| `mugplan_dev.project_attachment` | geändert | 1 Projektanhang-Datensatz geloescht |
| `mugplan_dev.appointment_employee` | geändert | 2 Terminmitarbeiter-Zuordnungen geloescht |
| Dateispeicher fuer Anhaenge | geändert | 1 Anhangdatei geloescht |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
