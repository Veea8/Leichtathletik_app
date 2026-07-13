# Leichtathletik App — Hinweise für KI-Agenten

App für Schweizer Leichtathletik-Trainingsgruppen. Details und Setup: siehe README.md.

## Expo

Expo SDK 57 — bei API-Fragen die versionierten Docs nutzen: https://docs.expo.dev/versions/v57.0.0/

## Konventionen

- **Sprache:** UI-Texte und Code-Kommentare auf Deutsch, Bezeichner (Variablen, Funktionen) auf Englisch.
- **Lesbarkeit vor Cleverness:** Der Code soll für einen CS-Studenten nachvollziehbar bleiben — klare, konventionelle Patterns, keine überraschenden Abstraktionen, keine unnötigen Dependencies.
- **Datenzugriff:** Supabase-Queries direkt in den Screens (via `useLoad`-Hook), kein zusätzlicher State-Manager. Sicherheitslogik gehört in die RLS-Policies (`supabase/schema.sql`), nicht in den Client.
- **Datums-Konvention:** Reine Datumsfelder (`performed_on`, `held_on`, …) als lokale Daten behandeln — Helfer `toIsoDate`/`parseDateOnly` aus `src/lib/format.ts` verwenden, nie `toISOString().slice(...)` auf lokale Daten.
- **Typecheck:** `npx tsc --noEmit` muss vor jedem Abschluss sauber durchlaufen. `supabase/functions/` ist Deno-Code und vom tsconfig ausgeschlossen.
- **Schema-Änderungen:** `supabase/schema.sql` ist die Quelle der Wahrheit und wird manuell im Supabase SQL Editor ausgeführt. Bei Änderungen an bestehenden Tabellen zusätzlich ein Migrations-Snippet für den User bereitstellen (das Schema läuft nicht automatisch).
