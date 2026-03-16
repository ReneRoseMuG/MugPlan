# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]: MuG Plan
    - generic [ref=e7]: Bitte melde dich mit Benutzername oder E-Mail und Passwort an.
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: Schnelllogin (Test)
      - generic [ref=e11]:
        - 'button "Log In als Admin Benutzer: test-admin" [ref=e12] [cursor=pointer]':
          - generic [ref=e13]:
            - generic [ref=e14]: Log In als Admin
            - generic [ref=e15]: "Benutzer: test-admin"
        - button "Log In als Disponent Kein aktiver Benutzer fuer diese Rolle" [disabled]:
          - generic:
            - generic: Log In als Disponent
            - generic: Kein aktiver Benutzer fuer diese Rolle
        - button "Log In als Monteur Kein aktiver Benutzer fuer diese Rolle" [disabled]:
          - generic:
            - generic: Log In als Monteur
            - generic: Kein aktiver Benutzer fuer diese Rolle
    - generic [ref=e16]:
      - generic [ref=e17]:
        - text: Benutzername oder E-Mail
        - textbox "Benutzername oder E-Mail" [ref=e18]
      - generic [ref=e19]:
        - text: Passwort
        - textbox "Passwort" [ref=e20]
      - button "Anmelden" [ref=e21] [cursor=pointer]
```