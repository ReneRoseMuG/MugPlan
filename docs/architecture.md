# Architektur- und Systemregeln – Webentwicklung

Dieses Dokument beschreibt die grundlegenden Architektur- und Systemregeln für die Entwicklung moderner Webanwendungen. Es ist **rollen- und toolunabhängig** und dient als fachlicher Referenzrahmen für Analyse, Implementierung und Refactoring.

Ziel ist ein System, das verständlich, wartbar, erweiterbar und testbar bleibt, ohne durch Überabstraktion unnötige Komplexität zu erzeugen.

---

## 1. Grundprinzipien

Die Architektur bleibt modular, aber bewusst einfach. Strukturen entstehen aus konkreten Anforderungen und nicht aus theoretischen Modellen.

Verantwortlichkeiten sind klar getrennt. Jede Ebene erfüllt genau eine Aufgabe und kennt ihre Grenzen. Implizite Kopplungen und Seiteneffekte werden vermieden.

Architektur dient der Ordnung und Wartbarkeit. Sie ist kein Selbstzweck.

---

## 2. Schichten und Verantwortlichkeiten

Die Anwendung ist logisch in Schichten gegliedert. Ein praktikables Grundmodell ist:

- **Views**: Darstellung und Erfassung von UI-Eingaben. Views enthalten keine Fachlogik.
- **Controller**: Koordination des Ablaufs. Laden von Daten, Binden von Events, UI-nahe Validierung, Auslösen von Render- oder Service-Aufrufen.
- **Services**: Kapselung fachlicher Use-Cases (z. B. Erstellen, Ändern oder Verknüpfen von Entitäten).
- **Repositories**: Zugriff auf Persistenz (API, Datenbank, Local Storage). Repositories enthalten keine UI- oder Use-Case-Logik.
- **Shared**: Wiederverwendbare Utilities, einfache Helfer und klar abgegrenzte Querschnittsfunktionen.

Die UI bleibt austauschbar, da Fachlogik nicht in Views oder Controllern versteckt wird.

---

## 3. Views und Controller

Eine View repräsentiert einen klar abgegrenzten Bildschirm- oder Funktionsbereich, beispielsweise eine Liste, ein Detailformular oder eine Dialogansicht.

Zu jeder View gehört genau **ein** Controller, der den Ablauf steuert. Controller wachsen mit der Funktionalität, nicht die Views.

Controller enthalten keine Persistenzlogik und keine fachlichen Entscheidungen, sondern koordinieren vorhandene Services.

---

## 4. Services und Use-Cases

Services bilden fachliche Use-Cases ab. Sie enthalten die Logik, die unabhängig von UI und Transport ist.

Services dürfen Repositories verwenden, kennen jedoch keine konkreten UI-Strukturen.

Neue Services entstehen nur, wenn ein klarer fachlicher Bedarf besteht. Es werden keine abstrakten Basisklassen oder Frameworks „auf Vorrat“ eingeführt.

---

## 5. Repositories und Persistenz

Repositories kapseln alle Zugriffe auf persistente Datenquellen.

SQL, Query-Logik, Transaktionen oder API-Aufrufe gehören ausschließlich in Repositories.

Controller und Services greifen nie direkt auf Datenbanken oder externe Schnittstellen zu.

---

## 6. Datei- und Ordnerstruktur

Die Datei-Organisation folgt Zuständigkeiten, nicht persönlichen Vorlieben.

Ein minimales, bewährtes Grundschema ist:

- `views/`
- `controllers/`
- `services/`
- `repositories/`
- `shared/`

Einmal etablierte Strukturen werden konsequent weiterverwendet. Neue Ordner entstehen nur bei nachvollziehbarem Bedarf.

---

## 7. Wiederverwendung und Duplikate

Duplikate werden vermieden, ohne in Generalisierungszwang zu verfallen.

Wenn mehrere Bereiche dasselbe Verhalten benötigen, wird ein wiederverwendbares Modul geschaffen, das konfigurierbar ist.

Umgekehrt gilt: Es werden keine abstrakten Konstrukte eingeführt, solange nur ein konkreter Anwendungsfall existiert.

---

## 8. Datenmodelle

Datenmodelle bleiben bewusst klein und stabil.

Änderungen an Modellen erfolgen nur, wenn sie durch fachliche Anforderungen motiviert sind.

Modelle werden nicht aus architektonischer Ideologie heraus erweitert oder umgebaut.

---

## 9. Server- und Bootstrap-Code

Bootstrap-Code (z. B. `server.js`) dient ausschließlich der Initialisierung und Verdrahtung.

Er enthält keine Fachlogik, keine Persistenzlogik und keine komplexen Abläufe.

Routen delegieren direkt an Controller. Fachliche Entscheidungen finden nicht im Bootstrap statt.

---

## 10. Plattform- und Umgebungsbewusstsein

Unterschiedliche Laufzeitumgebungen (lokal, Server, CI, unterschiedliche Node-Versionen) werden bewusst berücksichtigt.

Lösungen müssen lokal nachvollziehbar funktionieren und dürfen spätere Deployments nicht still blockieren.

---

## 11. Testbarkeit als Architektureigenschaft

Architektur unterstützt Testbarkeit durch klare Verantwortlichkeiten, begrenzte Abhängigkeiten und isolierbare Logik.

Fachliche Logik ist so zu strukturieren, dass sie unabhängig von UI und Infrastruktur geprüft werden kann.

Testbarkeit ist ein Qualitätsmerkmal der Architektur, kein nachträgliches Zusatzfeature.

