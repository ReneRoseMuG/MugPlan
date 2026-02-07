# FT (18) – Abschlussdokumentation: User Settings (Scopes GLOBAL/ROLE/USER)

## Zweck und Ergebnis
Dieses Feature implementiert eine read-only Settings-Infrastruktur mit Contract-First API, persistierten Werten und einer Landing Page unter dem bestehenden Menüpunkt „Einstellungen“. Einstellungen werden für einen konkreten Nutzer deterministisch aufgelöst, indem USER-Werte ROLE-Werte überschreiben, ROLE-Werte GLOBAL-Werte überschreiben und ansonsten der Registry-Default greift.

## Architektur und Auflösungsregel
Die Auflösung erfolgt strikt in der Reihenfolge USER > ROLE > GLOBAL > DEFAULT. Die Rolle eines Nutzers wird ausschließlich serverseitig aus der Beziehung users → roles geladen. Da die Datenbank Rollen-Codes READER, DISPATCHER und ADMIN nutzt, normalisiert der Resolver diese Codes auf die kanonische Menge LESER, DISPONENT und ADMIN für API und Frontend-Darstellung. Für ROLE-Scoped Persistenz wird bewusst der DB-Code gespeichert, um keine semantischen Duplikate im Storage zu erzeugen.

## Öffentliche API (Contract-First)
Es existiert ein neuer Endpunkt GET /api/user-settings/resolved, der resolved Settings inklusive Metadaten liefert. Die Response enthält pro Setting mindestens defaultValue, optionale Scope-Werte (globalValue, roleValue, userValue), resolvedValue, resolvedScope sowie roleCode und roleKey, sodass die Herkunft des wirksamen Wertes transparent ist. Der Contract ist in shared/routes.ts und server/routes.ts verdrahtet.

## Persistenz und Schema
Im Drizzle-Schema wurden roles und users (mit roleId FK) modelliert. Zusätzlich wurde user_settings_value implementiert, inklusive Unique-Constraint über (setting_key, scope_type, scope_id). Der GLOBAL-Marker ist im gesamten Stack fest auf scope_id = "global" definiert.

## Backend-Implementierung
Die Schichten Route → Controller → Service → Repository sind umgesetzt. Die Auflösung lädt USER/ROLE/GLOBAL Kandidaten und fällt bei fehlendem oder ungültigem persistiertem Wert deterministisch auf die nächste Stufe zurück. Der Nutzerkontext wird über requestUserContext.ts bereitgestellt.

## Frontend-Implementierung (read-only)
Es existiert ein SettingsProvider mit Hook-API, und eine SettingsPage als read-only Landing Page, die über den bestehenden Menüpunkt „Einstellungen“ erreichbar ist. Die Seite zeigt pro Setting mindestens Label, resolvedValue und resolvedScope. Es gibt keine Edit-Controls und keinen Save-Flow.

## Migration/Seed
Es existiert ein idempotenter Rollen-Seed (seed-roles.ts) samt Script db:seed:roles sowie eine SQL-Datei 2026-02-07_ft18_settings_scopes.sql für die Settings-Tabelle und Constraints.

## Validierung
npm run check und npm run build sind erfolgreich durchgelaufen.

## Bekannte Abweichung und Begründung
Da aktuell noch kein echtes Auth-System existiert, wird req.userId temporär aus SETTINGS_USER_ID (Env, Default 1) gesetzt. Die Rollenauflösung selbst ist trotzdem vollständig DB-basiert über users → roles und nicht client- oder headerbasiert. Diese Übergangslösung ist bewusst gewählt, um die Settings-Infrastruktur testbar zu machen, ohne das Auth-Thema in FT(18) zu ziehen.

## Betrieb und Nutzung
Zum lokalen Testen muss SETTINGS_USER_ID gesetzt werden, sofern nicht User 1 existiert. Der Endpunkt GET /api/user-settings/resolved muss im laufenden Backend erreichbar sein, und die Landing Page ist über den Menüpunkt „Einstellungen“ im UI aufrufbar.
