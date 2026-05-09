# FT-07 DB-Dry-Run für Dump-Import vorbereiten

Die offene Decision zum echten DB-Dry-Run für Dump-Imports soll als Aufgabe vorbereitet werden. Der Fokus liegt zunächst auf Safety-Guards, isolierten Zielumgebungen und Konfigurationsgrenzen, bevor ein produktnaher Admin-Pfad umgesetzt werden kann.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Datensicherung | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll den späteren DB-Dry-Run für Dump-Imports sicher vorbereiten. Vor jeder Umsetzung müssen Ziel-Datenbank, Upload-Pfad, Cleanup und Guards eindeutig isoliert sein.

## Ausgangslage

W-22 beschreibt, dass die heutige Importvorschau Archiv- und Manifestprüfungen abdeckt, aber keinen echten SQL-seitigen Trockenlauf ausführt. SQL-Importierbarkeit, Foreign-Key-Konflikte und Schema-Mismatches werden dadurch erst im destruktiven Apply-Pfad sichtbar.

## Umfang

- Die benötigten Dry-Run-Env-Variablen und Allowlists fachlich und technisch vorbereiten.
- Sicherheitsgrenzen gegen Dev-, Test- und Produktionsdatenbanken dokumentieren.
- Upload- und Cleanup-Grenzen für den isolierten Dry-Run-Pfad klären.
- Nicht Teil der Aufgabe ist ein produktiver Import-Dry-Run ohne bestätigte Zielumgebung.

## Umsetzungshinweise

- Betroffene Rolle ist ausschließlich ADMIN.
- Die Durchsetzung muss serverseitig erfolgen; UI-Sichtbarkeit reicht nicht.
- Dry-Run-Datenbank und Upload-Root dürfen nicht identisch mit normalen Dev-, Test- oder Produktionszielen sein.
- Dump-Inhalte können sensible Auth-, 2FA- und Upload-Daten enthalten und dürfen nicht ungeeignet protokolliert werden.

## Blocker und offene Fragen

- Die isolierten Dry-Run-Datenbanken und Upload-Pfade sind noch nicht bereitgestellt.

---

## Beziehungen

- Features: FT-07 Automatisierte Datensicherung und Fallback
- Entscheidungen: [W-22 - FT-07 echter DB-Dry-Run für Dump-Import](../decisions/w-22-ft07-db-dry-run-dump-import.md)
