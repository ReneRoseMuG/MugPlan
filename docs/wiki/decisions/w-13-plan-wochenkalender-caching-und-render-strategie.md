# Plan: Wochenkalender schneller starten, cachen, rendern und aktuell halten

## Zusammenfassung

Der Wochenkalender bleibt als horizontaler Scrollcontainer erhalten. Die Performance wird verbessert, indem Daten pro Kalenderwoche gecacht, sichtbare Wochen priorisiert geladen und zusätzliche Wochen im Hintergrund vorgehalten werden. Zusätzlich wird festgelegt, wie gecachte Termine nach Änderungen an Termin, Projekt, Kunde, Tags, Notizen, Anhängen, Touren oder Wochenplanung wieder aktuell werden.

Wichtiges Prinzip: **Cache-Puffer ist Datenvorrat, kein Render-Puffer.** Gerendert wird nur das Scrollfenster. Der Cache hält links und rechts zusätzliche Wochen warm.

Cache-Puffer:

- Render-/Scrollfenster: `scrollStart` bis `scrollEnd`
- Cache links: `max(aktuelle KW, scrollStart - 4 KW)`
- Cache rechts: `scrollEnd + 4 KW`
- Cache-Gesamtbereich: `cacheStart` bis `cacheEnd`

## Daten-Caching und Aktualisierung

Die bestehende API `/api/calendar/appointments` bleibt erhalten. Im Frontend wird sie wochengenau abgefragt und gecacht.

Neue Query-Key-Struktur:

- `["calendarAppointments", "week", weekStartDate, employeeIdOrAll, userRole, detail]`
- `["calendarWeekLaneEmployeePreviews", "week", weekStartDate]`
- `["calendarBlockedTourWeeks", "week", weekStartDate]`

Lade-Reihenfolge:

- Startwoche sofort laden.
- Restliche Wochen des Scrollcontainers danach laden.
- Cache-Puffer links/rechts anschließend per `queryClient.prefetchQuery` laden.
- Nach Vor/Zurück, KW-Sprung oder debounced Scrollfokus den Puffer um das neue Scrollfenster aktualisieren.

Aktualisierung gecachter Termine:

- Nach Termin-Mutationen werden alle Queries mit Prefix `calendarAppointments` invalidiert. Dadurch werden sichtbare Wochen aktiv neu geladen und gepufferte Wochen beim nächsten Zugriff oder Prefetch aktualisiert.
- Nach Projekt-, Kunden-, Tag-, Notiz-, Attachment-, Tour- oder Wochenplanungsänderungen bleiben bestehende Prefix-Invalidierungen erhalten und werden auf die neuen wochengenauen Keys geprüft.
- Für Änderungen, die ein Termin-Datum, Enddatum, Tour oder Mitarbeiterzuordnung verändern, wird zusätzlich die alte und neue betroffene Woche invalidiert, falls diese Information im Mutationsergebnis verfügbar ist.
- Wenn alte/neue Woche nicht sicher bekannt ist, wird konservativ der gesamte `calendarAppointments`-Prefix invalidiert.
- Prefetch nutzt invalidierte Daten nicht als endgültig aktuell, sondern lädt stale Queries im Hintergrund nach.
- Sichtbare Wochen dürfen bei Refetch kurz alte Daten zeigen, aber nicht dauerhaft stale bleiben.

Empfohlene Query-Policy:

- `staleTime` niedrig halten oder auf `0` belassen, damit invalidierte Wochen zuverlässig refetchen.
- `gcTime` moderat setzen, z. B. 10-30 Minuten, damit Navigation im Kalender vom Cache profitiert, ohne unbegrenzt alten Speicher zu halten.
- `refetchOnWindowFocus` für Kalenderwochen aktiv lassen oder gezielt aktivieren, damit längere Pausen im Browser aktualisiert werden.
- Nach Rückkehr aus Termin-, Projekt- oder Kundendialogen immer Prefix-Invalidierung ausführen, wie bisher.

## Render-Optimierungen

Der Scrollcontainer rendert weiterhin nur die Wochen aus `calendarWeekScrollRange + 1`. Cache-only-Wochen werden nicht in den DOM aufgenommen.

Für Wochen ohne fertige Daten wird eine stabile Section mit Header und Ladezustand gerendert. Breite und Scrollposition bleiben erhalten.

Die Wochenaufbereitung wird pro Woche memoisiert:

- Keine Filterung eines großen Range-Payloads über alle Wochen.
- `lanesByWeekStart` arbeitet wochengenau.
- `buildWeekLaneRenderData` läuft nur für gerenderte Wochen.
- Wochen ohne Datenänderung behalten stabile Referenzen.

Höhenmessungen werden begrenzt:

- Messwerte pro `weekKey + laneKey`.
- Re-Render nur bei tatsächlicher Messwertänderung.
- Reset nur für betroffene Woche oder bei globalem Displaymodus-Wechsel.

Kartenkomponenten werden vorsichtig memoisiert. Hover-State und Highlighting sollen nicht den gesamten Kalenderbaum neu rendern, sondern nur die betroffenen Karten.

## Auswirkungen und Risiken

Erwartetes Ergebnis:

- Startwoche erscheint schneller.
- Weitere Scrollwochen füllen sich im Hintergrund.
- Vor/Zurück und KW-Sprung profitieren vom warmen Cache.
- Änderungen an Terminen, Projekten, Kunden und Kindelementen werden über Query-Invalidierung in sichtbaren und gepufferten Wochen aktualisiert.

Schadenspotential: **mittel**.

Hauptrisiken:

- Stale Kalenderkarten nach Mutationen, wenn ein neuer Query-Key nicht von bestehenden Invalidierungen erfasst wird.
- Doppelte oder fehlende Termine bei Terminverschiebungen zwischen Wochen.
- Gebrochene Scroll-/Restore-Logik, wenn Ladezustände die Section-Breite verändern.
- Zu viele Hintergrundrequests, wenn Scrollereignisse nicht debounced werden.

Begrenzung:

- Bestehende Query-Prefixe bleiben erhalten.
- Sichtbare Wochen werden priorisiert refetched.
- Unsichere Mutationen invalidieren konservativ den gesamten Kalendertermin-Prefix.
- Cache-Puffer wird nicht gerendert.
- Keine API-, Schema- oder Persistenzänderung.

## Tests und Akzeptanzkriterien

Unit-Tests:

- Cache-Fenster berechnet links `max(aktuelle KW, scrollStart - 4)` und rechts `scrollEnd + 4`.
- Renderfenster bleibt auf `calendarWeekScrollRange + 1` Wochen begrenzt.
- Query-Keys enthalten Woche, Mitarbeiterfilter, Rolle und Detailgrad.
- Prefix-Invalidierung trifft neue wochengenaue Terminqueries.
- Terminverschiebung invalidiert alte und neue Woche oder fällt auf Prefix-Invalidierung zurück.
- Projekt-/Kunden-/Notiz-/Attachment-/Tag-Änderungen invalidieren Kalenderqueries.
- Debounced Scrollfokus löst nicht pro Scrolltick Prefetches aus.

Browser-/E2E-Szenarien:

- Wochenkalender öffnet die Startwoche schnell und lädt weitere Scrollwochen nach.
- Mausrad-/Horizontal-Scroll bleibt nutzbar.
- KW-Sprung lädt Zielwoche und hält Zurück-Funktion stabil.
- Terminänderung in einer sichtbaren Woche aktualisiert die Karte nach Rückkehr.
- Projekt- oder Kundenänderung aktualisiert Kalenderkarten mit Projekt-/Kundendaten.
- Terminverschiebung aus KW A nach KW B entfernt ihn aus A und zeigt ihn in B.
- Mitarbeiterfilter nutzt getrennten Cache und zeigt keine ungefilterten Alttermine.

Auszuführende Kommandos nach Umsetzung:

- `npm run test:unit`
- relevante Browser-E2E-Szenarien für KW-Sprung, Wochenraster und Terminänderung
- `npm run check`

## Annahmen und Festlegungen

- `/api/calendar/appointments` bleibt unverändert.
- Keine DB-Migration, keine neue Dependency.
- `calendarWeekScrollRange` bleibt die Quelle für die Anzahl gerenderter Scrollwochen.
- Cache-Puffergröße ist fest `4 KW` links und rechts.
- Links wird frühestens ab aktueller KW gepuffert.
- Cache-only-Wochen werden nicht gerendert.
- Sichtbare Daten müssen nach Mutationen aktiv invalidiert werden.
- Gepufferte Daten dürfen kurz stale sein, müssen aber durch Prefetch oder nächsten Zugriff aktualisiert werden.
