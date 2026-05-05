# FT (07) Backlog

## E-Mail-Versand nach Backup-Lauf

Quelle: https://www.notion.so/33ada094354e80fb958ac334f264bad9

Status: Backlog / nicht begonnen

Notion-Titel: E-Mail Versandt

### Ziel / Zweck

Nach jedem erfolgreichen Backup-Lauf soll die erzeugte Backup-Datei per E-Mail an eine konfigurierte Empfängeradresse versendet werden.

Das gilt sowohl für automatisch durch den Scheduler erzeugte Backups als auch für manuell durch einen Administrator ausgelöste Backup-Läufe. Der Versand dient als zusätzliche externe Sicherungskopie und soll sicherstellen, dass ein aktueller Stand das System verlässt, ohne dass ein Administrator die Datei aktiv herunterladen muss.

### Fachliche Beschreibung

Der E-Mail-Versand erfolgt im Anschluss an einen erfolgreichen Backup-Lauf. Die E-Mail enthält die erzeugte Backup-Datei als Anhang.

Scheitert der Versand, bleibt das Backup selbst davon unberührt. Der Versandfehler wird protokolliert, blockiert aber weder die Backup-Erzeugung noch den normalen Systembetrieb. Der E-Mail-Versand ist damit ein nachgelagerter, nicht-kritischer Folgepfad.

Der Versand soll aktivierbar und deaktivierbar sein. Die Empfängeradresse wird durch einen Administrator im Einstellungsbereich gepflegt und persistiert.

### Konfiguration

Zugangsdaten für den Mailversand, insbesondere Server, Port, Absender und Authentifizierung, werden über die Serverkonfiguration bereitgestellt.

Die Empfängeradresse wird im Einstellungsbereich des Administrators gepflegt. Diese Einstellung muss serverseitig rollenbeschränkt sein und darf nicht allein über UI-Sichtbarkeit abgesichert werden.

### Regeln & Randbedingungen

- E-Mail-Versand setzt einen erfolgreichen Backup-Lauf voraus.
- Der Versand erfolgt nach automatischen und manuellen Backup-Läufen.
- Der Versand darf den Backup-Lauf nicht zum kritischen Pfad machen.
- Versandfehler werden protokolliert.
- Backup-Dateien bleiben auch bei Versandfehlern erhalten.
- Versand kann aktiviert oder deaktiviert werden.
- Mailserver-Zugangsdaten gehören in die Serverkonfiguration und dürfen nicht in Wiki, Code, Logs oder Admin-UI offengelegt werden.
- Die Empfängeradresse darf ausschließlich durch Administratoren gepflegt werden.
- Große Backup-Dateien können den Mailversand unpraktikabel machen.

### Abhängigkeiten und Abgrenzung

Dieses Backlog setzt den automatischen Backup-Lauf mit integriertem Dump voraus, weil die erzeugte ZIP-Datei als Mailanhang versendet werden soll.

Backup Cloud Sync bleibt als mögliche Ergänzung oder Alternative offen, falls Backup-Dateien für den Mailversand zu groß werden.

### Offene Klärungen

- Ab welcher Dateigröße soll der Versand übersprungen oder durch Cloud Sync ersetzt werden?
- Soll ein Administrator bei fehlgeschlagenem Versand zusätzlich benachrichtigt werden?
- Wo wird die Empfängeradresse technisch gespeichert und wie wird sie validiert?
- Soll es eine Testmail-Funktion geben?
- Wie werden Versandstatus und Fehlermeldungen in der Backup-Historie sichtbar?
- Welche Rollen dürfen Versandstatus sehen, Versand aktivieren und die Empfängeradresse ändern?

## Backup Cloud Sync

Quelle: https://www.notion.so/33ada094354e801e9017e3e4424871c6

Status: Backlog / nicht begonnen

### Ziel / Zweck

Backup-Dateien sollen nach ihrer Erzeugung automatisch in einen konfigurierten Cloud-Speicher übertragen werden.

Cloud Sync dient als Ergänzung oder Alternative zum E-Mail-Versand, insbesondere wenn die Backup-Dateien eine Größe erreichen, bei der ein Mail-Anhang unpraktikabel oder unzuverlässig wird.

### Fachliche Beschreibung

Nach jedem erfolgreichen Backup-Lauf wird die erzeugte Backup-Datei in einen konfigurierten Cloud-Speicher übertragen. Der Upload erfolgt nicht blockierend. Fehler werden protokolliert, ohne den Backup-Prozess zu gefährden.

Cloud Sync ist aktivierbar und deaktivierbar. Welcher Cloud-Dienst unterstützt werden soll, ist noch offen.

### Regeln & Randbedingungen

- Cloud Sync setzt einen erfolgreichen Backup-Lauf voraus.
- Der Upload erfolgt nach automatischen und manuellen Backup-Läufen, sofern Cloud Sync aktiv ist.
- Cloud Sync darf den Backup-Lauf nicht zum kritischen Pfad machen.
- Uploadfehler werden protokolliert.
- Backup-Dateien bleiben auch bei Uploadfehlern erhalten.
- Cloud Sync kann aktiviert oder deaktiviert werden.
- Zugangsdaten und Zielordner gehören in geschützte Server- bzw. Admin-Konfiguration und dürfen nicht in Wiki, Code oder Logs offengelegt werden.
- Konfiguration und Aktivierung dürfen ausschließlich Administratoren möglich sein und müssen serverseitig rollenbeschränkt werden.

### Abhängigkeiten und Abgrenzung

Cloud Sync ergänzt den E-Mail-Versand nach Backup-Lauf. Offen ist, ob beide Kanäle unabhängig nebeneinander laufen oder ob Cloud Sync den Mailversand ab einer bestimmten Dateigröße ersetzt.

Der Eintrag setzt den automatischen Backup-Lauf mit integriertem Dump voraus, weil die erzeugte ZIP-Datei übertragen werden soll.

### Offene Klärungen

- Welcher Cloud-Dienst soll unterstützt werden, zum Beispiel Nextcloud, S3-kompatibler Speicher oder Google Drive?
- Soll Cloud Sync den Mailversand bei Überschreitung einer bestimmten Dateigröße automatisch ersetzen?
- Wie werden Zugangsdaten und Zielordner konfiguriert?
- Wie werden Uploadstatus und Fehler in der Backup-Historie sichtbar?
- Gibt es eine Test-Upload-Funktion?
- Welche Rollen dürfen Cloud Sync aktivieren, Zielordner ändern und Uploadstatus sehen?
