# 2FA-Absicherung und Admin-Benutzerpflege

architecture.md und rules.md gelesen und verstanden.

Verwendete maßgebliche Quellen in diesem Repository:
- `docs/architecture.md`
- `agents.md`

## 2FA-Aktivierungsflow

Der globale Setting-Key `auth_two_factor_enabled` steuert nur, ob 2FA für die Anwendung aktiv beziehungsweise verpflichtend ist.
Er ersetzt kein benutzerspezifisch bestätigtes Secret.

Login-Verhalten:
- Global deaktiviert: Passwort-Login führt direkt zur Anmeldung.
- Global aktiviert und benutzerspezifisches Secret technisch lesbar vorhanden: Login liefert `2fa_required`.
- Global aktiviert und kein Secret oder inkonsistentes Secret vorhanden: Login liefert `2fa_setup_required`.

Ein neues Secret wird nur temporär im Session-`preAuth` gehalten.
Erst nach erfolgreicher TOTP-Bestätigung wird es dauerhaft gespeichert.

## Beteiligte Datenbankfelder

- `users.two_factor_secret_encrypted`
- `users.two_factor_backup_codes_reserved`
- `users.username`
- `users.email`
- `users.first_name`
- `users.last_name`
- `users.full_name`
- `users.role_id`
- `users.is_active`
- `users.version`

## Behobene Inkonsistenz

Der problematische Zustand war:
- globale 2FA aktiv
- Benutzer ohne serverseitig nutzbares Secret

Früher konnte ein solcher Benutzer in einen nicht auflösbaren 2FA-Zustand geraten.
Jetzt wird ein fehlendes, leeres oder technisch unlesbares Secret beim Login wie „Setup fehlt“ behandelt.
Dadurch führt der Login kontrolliert in den Setup-Flow statt in einen Verify-Blocker.

## Admin-Reset für einzelne Benutzer

Ein Admin kann 2FA pro Benutzer zurücksetzen.
Der Reset:
- löscht nur `two_factor_secret_encrypted`
- löscht nur `two_factor_backup_codes_reserved`
- ändert kein Passwort
- ändert keine Rolle
- ändert keine sonstigen Stammdaten

Folge:
- der betroffene Benutzer muss 2FA beim nächsten Login neu einrichten

## Schutzregeln gegen Aussperren

- Die bestehende Schutzregel gegen Entzug der letzten Admin-Rolle bleibt aktiv.
- Der letzte aktive Admin darf nicht deaktiviert werden.
- Ein Admin darf seine eigene 2FA nicht zurücksetzen, wenn globale 2FA aktiv ist und kein anderer aktiver Admin als Rückfallanker verbleibt.

## Backup-Codes

Backup-Codes sind derzeit nicht als fertiger nutzbarer Produkt-Flow umgesetzt.
Aktuell ist nur die reservierte Spalte `users.two_factor_backup_codes_reserved` vorhanden.
Es wurde kein neuer Backup-Code-Mechanismus eingeführt.
