# Tabbed FormLayout Basiskomponente

## Zweck
Ein additive, generische Basiskomponente fuer tabbasierte Entity-Formulare bereitstellen, ohne bestehende Formulare umzubauen.

## Scope
- Neue UI-Basiskomponente `EntityFormWithTabsLayout` als Wrapper um `EntityFormLayout`.
- Lokale Tab-Navigation (kein URL-Routing).
- Keine Migration bestehender Formulare.
- Kleine Doku-Ergaenzung im Engineering-Handbook.

## Technische Entscheidungen
- Neue Komponente in `client/src/components/ui/entity-form-with-tabs-layout.tsx`.
- Oeffentliche Typen:
  - `EntityFormTabDefinition`
  - `EntityFormWithTabsLayoutProps`
- Sichtbare Tabs: `tab.visible !== false`.
- Aktiver Tab:
  - controlled via `activeTabId` optional
  - sonst lokal via React-State
  - deterministischer Fallback auf ersten sichtbaren Tab.
- Empty-State statt Crash, wenn keine sichtbaren Tabs vorhanden sind.
- `keepMounted=true` als Default, `TabsContent` mit `forceMount` nur wenn aktiv.
- `onActiveTabChange(next, prev)` meldet Wechsel, blockiert nicht.

## Betroffene Dateien
- `client/src/components/ui/entity-form-with-tabs-layout.tsx` (neu)
- `docs/implementation.md` (Abschnitt `3.15 EntityFormWithTabsLayout Pattern`)

## Hinweise zum Testen
- Ausgefuehrt:
  - `npm run check`
  - `npm run typecheck`
- Beide Kommandos erfolgreich.

## Bekannte Einschraenkungen
- Keine direkte Integration in bestehende Formulare in diesem Ticket.
- Keine zusaetzlichen Dirty-/Validierungs-Guards beim Tab-Wechsel.
- Keine URL-basierte Tab-Persistenz.
