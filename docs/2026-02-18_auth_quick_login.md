# Auth Quick Login (Testbetrieb)

Der Schnelllogin ist nur fuer Test-/Entwicklungsbetrieb gedacht.

## Env-Flags

- Server: `AUTH_QUICK_LOGIN_ENABLED=true`
- Client: `VITE_AUTH_QUICK_LOGIN_ENABLED=true`

## Aktivierungsregeln

Quick Login ist nur aktiv, wenn beide Bedingungen erfuellt sind:

1. `NODE_ENV !== "production"`
2. `AUTH_QUICK_LOGIN_ENABLED === "true"`

## Verhalten

- Login-Screen zeigt drei Schnelllogin-Schaltflaechen:
  - Admin (`ADMIN`)
  - Disponent (`DISPATCHER`)
  - Monteur (`READER`)
- Es wird jeweils der erste aktive Benutzer der Rolle (kleinste `users.id`) verwendet.
- Falls fuer eine Rolle kein aktiver Benutzer existiert, bleibt die Schaltflaeche deaktiviert.
