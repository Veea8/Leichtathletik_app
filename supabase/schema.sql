-- ============================================================
-- Leichtathletik App — Datenbankschema
-- Einmalig im Supabase SQL Editor ausführen (Dashboard > SQL Editor).
-- ============================================================

-- ------------------------------------------------------------
-- Profile: 1:1 zu auth.users, wird beim Registrieren angelegt
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Profil automatisch anlegen, wenn sich ein User registriert.
-- display_name kommt aus den Signup-Metadaten (siehe lib/auth.tsx).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Athlet:in'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Trainingsgruppen + Mitgliedschaften
-- Die Rolle (coach/athlete) gilt pro Gruppe, nicht global.
-- ------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('coach', 'athlete')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

-- ------------------------------------------------------------
-- Trainings + An-/Abmeldungen
-- ------------------------------------------------------------
create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  starts_at timestamptz not null,
  location text not null,
  program text,                -- Trainingsinhalt, z.B. "Sprint-Technik + Starts"
  equipment_note text,         -- z.B. "Spikes mitnehmen"
  cancelled boolean not null default false,
  series_id uuid,              -- gruppiert wöchentlich wiederholte Trainings
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.signups (
  training_id uuid not null references public.trainings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('in', 'out')),
  note text,                   -- z.B. "komme 15 Min später"
  updated_at timestamptz not null default now(),
  primary key (training_id, profile_id)
);

-- ------------------------------------------------------------
-- Disziplinen (fixe Liste, siehe Seed unten) + Athleten-Tags
-- ------------------------------------------------------------
create table public.disciplines (
  id text primary key,          -- z.B. '100m', 'weit'
  name text not null,           -- Anzeigename, z.B. '100 m', 'Weitsprung'
  category text not null check (category in ('sprint', 'lauf', 'huerden', 'sprung', 'wurf', 'mehrkampf')),
  unit text not null check (unit in ('seconds', 'meters', 'points')),
  lower_is_better boolean not null,  -- Zeiten: true, Weiten/Höhen/Punkte: false
  sort_order int not null
);

create table public.athlete_disciplines (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  discipline_id text not null references public.disciplines (id),
  primary key (profile_id, discipline_id)
);

-- ------------------------------------------------------------
-- Leistungen (Training UND Wettkampf — das Herzstück der App)
-- Bestleistungen werden abgefragt, nicht gespeichert.
-- ------------------------------------------------------------
create table public.performances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  discipline_id text not null references public.disciplines (id),
  value numeric not null,       -- Sekunden bzw. Meter bzw. Punkte
  performed_on date not null,
  context text not null check (context in ('training', 'competition')),
  note text,
  created_at timestamptz not null default now()
);

create index performances_by_athlete on public.performances (profile_id, discipline_id, performed_on);

-- ------------------------------------------------------------
-- Push-Tokens (Expo Push Notifications, ein Token pro Gerät)
-- ------------------------------------------------------------
create table public.push_tokens (
  token text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Wettkämpfe (vom Coach gepflegte Liste mit Anmeldeschluss)
-- ------------------------------------------------------------
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  location text,
  held_on date not null,
  registration_deadline date,
  link text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.trainings enable row level security;
alter table public.signups enable row level security;
alter table public.disciplines enable row level security;
alter table public.athlete_disciplines enable row level security;
alter table public.performances enable row level security;
alter table public.push_tokens enable row level security;
alter table public.competitions enable row level security;

-- Hilfsfunktionen (security definer, damit Policies nicht rekursiv werden)
create or replace function public.is_group_member(g uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = g and profile_id = auth.uid()
  );
$$;

create or replace function public.is_group_coach(g uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = g and profile_id = auth.uid() and role = 'coach'
  );
$$;

-- true, wenn der eingeloggte User mit p in mindestens einer Gruppe ist
create or replace function public.shares_group_with(p uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1
    from group_members mine
    join group_members theirs on mine.group_id = theirs.group_id
    where mine.profile_id = auth.uid() and theirs.profile_id = p
  );
$$;

-- true, wenn der eingeloggte User Coach in einer Gruppe von p ist
create or replace function public.is_coach_of(p uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1
    from group_members mine
    join group_members theirs on mine.group_id = theirs.group_id
    where mine.profile_id = auth.uid() and mine.role = 'coach'
      and theirs.profile_id = p
  );
$$;

-- profiles: eigenes Profil + Profile aus gemeinsamen Gruppen
create policy "profiles: eigene + Gruppenmitglieder lesen" on public.profiles
  for select using (id = auth.uid() or public.shares_group_with(id));
create policy "profiles: eigenes bearbeiten" on public.profiles
  for update using (id = auth.uid());

-- groups: nur Mitglieder sehen die Gruppe (Beitritt läuft über RPC unten)
create policy "groups: Mitglieder lesen" on public.groups
  for select using (public.is_group_member(id));
create policy "groups: Coach bearbeitet" on public.groups
  for update using (public.is_group_coach(id));

-- group_members
create policy "members: Mitglieder lesen" on public.group_members
  for select using (public.is_group_member(group_id));
create policy "members: selbst austreten" on public.group_members
  for delete using (profile_id = auth.uid());

-- trainings: Mitglieder lesen, Coach schreibt
create policy "trainings: Mitglieder lesen" on public.trainings
  for select using (public.is_group_member(group_id));
create policy "trainings: Coach erstellt" on public.trainings
  for insert with check (public.is_group_coach(group_id));
create policy "trainings: Coach bearbeitet" on public.trainings
  for update using (public.is_group_coach(group_id));
create policy "trainings: Coach löscht" on public.trainings
  for delete using (public.is_group_coach(group_id));

-- signups: Mitglieder der Gruppe lesen, jede:r schreibt nur die eigene
create policy "signups: Gruppe liest" on public.signups
  for select using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.is_group_member(t.group_id)
    )
  );
create policy "signups: eigene erstellen" on public.signups
  for insert with check (profile_id = auth.uid());
create policy "signups: eigene ändern" on public.signups
  for update using (profile_id = auth.uid());

-- disciplines: für alle eingeloggten lesbar, niemand schreibt
create policy "disciplines: lesen" on public.disciplines
  for select using (auth.role() = 'authenticated');

-- athlete_disciplines: eigene schreiben, Gruppenkolleg:innen lesen
create policy "athlete_disciplines: lesen" on public.athlete_disciplines
  for select using (profile_id = auth.uid() or public.shares_group_with(profile_id));
create policy "athlete_disciplines: eigene erstellen" on public.athlete_disciplines
  for insert with check (profile_id = auth.uid());
create policy "athlete_disciplines: eigene löschen" on public.athlete_disciplines
  for delete using (profile_id = auth.uid());

-- performances: eigene voll, Coach der Gruppe darf lesen
create policy "performances: eigene + Coach liest" on public.performances
  for select using (profile_id = auth.uid() or public.is_coach_of(profile_id));
create policy "performances: eigene erstellen" on public.performances
  for insert with check (profile_id = auth.uid());
create policy "performances: eigene ändern" on public.performances
  for update using (profile_id = auth.uid());
create policy "performances: eigene löschen" on public.performances
  for delete using (profile_id = auth.uid());

-- push_tokens: jede:r verwaltet nur die eigenen Tokens
create policy "push_tokens: eigene lesen" on public.push_tokens
  for select using (profile_id = auth.uid());
create policy "push_tokens: eigene erstellen" on public.push_tokens
  for insert with check (profile_id = auth.uid());
create policy "push_tokens: eigene ändern" on public.push_tokens
  for update using (profile_id = auth.uid());
create policy "push_tokens: eigene löschen" on public.push_tokens
  for delete using (profile_id = auth.uid());

-- competitions: Mitglieder lesen, Coach schreibt
create policy "competitions: Mitglieder lesen" on public.competitions
  for select using (public.is_group_member(group_id));
create policy "competitions: Coach erstellt" on public.competitions
  for insert with check (public.is_group_coach(group_id));
create policy "competitions: Coach bearbeitet" on public.competitions
  for update using (public.is_group_coach(group_id));
create policy "competitions: Coach löscht" on public.competitions
  for delete using (public.is_group_coach(group_id));

-- ============================================================
-- RPCs für Gruppen-Erstellung und Beitritt per Einladungscode
-- (security definer, weil Nicht-Mitglieder die Gruppe noch
-- nicht sehen dürfen — der Code ist der Zugangsschlüssel)
-- ============================================================

-- 6-stelliger Code ohne verwechselbare Zeichen (0/O, 1/I)
create or replace function public.generate_invite_code()
returns text
language sql volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql security definer set search_path = public
as $$
declare
  new_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;

  insert into groups (name, invite_code, created_by)
  values (group_name, generate_invite_code(), auth.uid())
  returning * into new_group;

  insert into group_members (group_id, profile_id, role)
  values (new_group.id, auth.uid(), 'coach');

  return new_group;
end;
$$;

create or replace function public.join_group(code text)
returns public.groups
language plpgsql security definer set search_path = public
as $$
declare
  target public.groups;
begin
  if auth.uid() is null then
    raise exception 'Nicht eingeloggt';
  end if;

  select * into target from groups where invite_code = upper(trim(code));
  if target.id is null then
    raise exception 'Ungültiger Einladungscode';
  end if;

  insert into group_members (group_id, profile_id, role)
  values (target.id, auth.uid(), 'athlete')
  on conflict (group_id, profile_id) do nothing;

  return target;
end;
$$;

-- ============================================================
-- Seed: Disziplinen (Swiss-Athletics-übliche Auswahl)
-- ============================================================
insert into public.disciplines (id, name, category, unit, lower_is_better, sort_order) values
  ('60m',    '60 m',            'sprint',    'seconds', true,  10),
  ('80m',    '80 m',            'sprint',    'seconds', true,  20),
  ('100m',   '100 m',           'sprint',    'seconds', true,  30),
  ('200m',   '200 m',           'sprint',    'seconds', true,  40),
  ('300m',   '300 m',           'sprint',    'seconds', true,  50),
  ('400m',   '400 m',           'sprint',    'seconds', true,  60),
  ('600m',   '600 m',           'lauf',      'seconds', true,  70),
  ('800m',   '800 m',           'lauf',      'seconds', true,  80),
  ('1000m',  '1000 m',          'lauf',      'seconds', true,  90),
  ('1500m',  '1500 m',          'lauf',      'seconds', true,  100),
  ('3000m',  '3000 m',          'lauf',      'seconds', true,  110),
  ('5000m',  '5000 m',          'lauf',      'seconds', true,  120),
  ('60mH',   '60 m Hürden',     'huerden',   'seconds', true,  130),
  ('100mH',  '100 m Hürden',    'huerden',   'seconds', true,  140),
  ('110mH',  '110 m Hürden',    'huerden',   'seconds', true,  150),
  ('300mH',  '300 m Hürden',    'huerden',   'seconds', true,  160),
  ('400mH',  '400 m Hürden',    'huerden',   'seconds', true,  170),
  ('hoch',   'Hochsprung',      'sprung',    'meters',  false, 180),
  ('weit',   'Weitsprung',      'sprung',    'meters',  false, 190),
  ('drei',   'Dreisprung',      'sprung',    'meters',  false, 200),
  ('stab',   'Stabhochsprung',  'sprung',    'meters',  false, 210),
  ('kugel',  'Kugelstossen',    'wurf',      'meters',  false, 220),
  ('diskus', 'Diskuswurf',      'wurf',      'meters',  false, 230),
  ('speer',  'Speerwurf',       'wurf',      'meters',  false, 240),
  ('hammer', 'Hammerwurf',      'wurf',      'meters',  false, 250),
  ('ball',   'Ballwurf',        'wurf',      'meters',  false, 260),
  ('mehrkampf', 'Mehrkampf',    'mehrkampf', 'points',  false, 270);
