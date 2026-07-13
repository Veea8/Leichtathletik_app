# Leichtathletik App 🏃

App für Schweizer Leichtathletik-Trainingsgruppen: Trainings­planung mit An-/Abmeldung, Leistungstagebuch (Training **und** Wettkampf) mit Bestleistungen und Verlauf, sowie Wettkampfliste mit Anmeldeschluss-Erinnerungen.

**Stack:** Expo (React Native) + TypeScript + Expo Router · Supabase (Postgres, Auth, RLS, Edge Functions) · Expo Push Notifications

## Einmalige Einrichtung

### 1. Supabase-Projekt erstellen

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt erstellen (Region: `eu-central` empfohlen).
2. Im Dashboard: **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen. Das legt alle Tabellen, Sicherheitsregeln (RLS) und die Disziplinen-Liste an.
3. Für die Pilotphase: **Authentication → Sign In / Up → Email** → „Confirm email" **deaktivieren** (sonst muss jede:r zuerst einen Bestätigungslink klicken).

### 2. App konfigurieren

```bash
cp .env.example .env
```

Dann in `.env` die Werte aus **Project Settings → API** eintragen (Project URL + anon public key).

### 3. Starten

```bash
npm install
npx expo start
```

- **Handy:** QR-Code mit der [Expo Go](https://expo.dev/go)-App scannen (gleiches WLAN).
- **Browser:** `w` drücken (eingeschränkt — Datums-Picker und Push funktionieren nur auf dem Handy).

**Erster Test:** Konto registrieren → als Coach „Gruppe erstellen" → mit einem zweiten Konto (z.B. im Browser) per Einladungscode beitreten.

## Push-Benachrichtigungen (optional, für den Pilot)

Push braucht ein verknüpftes EAS-Projekt und läuft **nicht in Expo Go auf Android** (nur im Development/EAS Build):

1. `npx eas init` (kostenloses Expo-Konto nötig) — verknüpft das Projekt.
2. Supabase CLI installieren, dann:
   ```bash
   supabase functions deploy notify-training-change --no-verify-jwt
   supabase functions deploy deadline-reminders --no-verify-jwt
   supabase secrets set WEBHOOK_SECRET=<zufälliger-string>
   ```
3. Im Supabase-Dashboard:
   - **Database → Webhooks**: Webhook auf Tabelle `trainings` (INSERT + UPDATE) → Edge Function `notify-training-change`, mit HTTP-Header `x-webhook-secret: <derselbe-string>`. → Benachrichtigt die Gruppe bei neuen/geänderten/abgesagten Trainings.
   - **Cron-Job** (Integrations → Cron): täglich 08:00 (`0 8 * * *`) → Edge Function `deadline-reminders`, gleicher Header. → Erinnert 3 Tage und 1 Tag vor jedem Anmeldeschluss.

## Verteilung an die Trainingsgruppe (Pilot)

```bash
npx eas build --profile preview --platform android   # APK zum direkten Installieren
npx eas build --platform ios                          # danach via TestFlight verteilen
```

Für iOS braucht es einen Apple-Developer-Account (99 $/Jahr); Android-APKs lassen sich direkt teilen.

## Projektstruktur

```
src/
  app/              Screens (Expo Router, dateibasiertes Routing)
    (auth)/         Login + Registrierung
    (tabs)/         Haupt-Tabs: Training, Leistungen, Wettkämpfe, Profil
    training/       Training erstellen/ansehen/bearbeiten
    leistung/       Leistung eintragen
    wettkampf/      Wettkampf erstellen/bearbeiten
    onboarding.tsx  Gruppe erstellen oder per Code beitreten
  components/       Wiederverwendbare UI-Bausteine
  lib/              Supabase-Client, Auth-Context, Typen, Formatierung
supabase/
  schema.sql        Komplettes Datenbankschema inkl. RLS-Policies
  functions/        Edge Functions für Push-Benachrichtigungen
```

## Architektur-Entscheidungen (Kurzfassung)

- **Rollen pro Gruppe** (`group_members.role`): Coach oder Athlet:in — kein globales Rollensystem.
- **Sicherheit über Row Level Security**: Der `anon`-Key darf in die App, weil jede Tabelle Policies hat (z.B. sehen nur Gruppenmitglieder die Trainings; Leistungen sieht nur die Person selbst + ihr Coach).
- **Gruppenbeitritt über RPC** (`join_group`): Nicht-Mitglieder dürfen Gruppen nicht lesen; der Einladungscode ist der Zugangsschlüssel.
- **Bestleistungen werden berechnet, nicht gespeichert** — eine Quelle der Wahrheit (`performances`).
- **Kein Chat** — bewusste Entscheidung, WhatsApp bleibt für Informelles.
