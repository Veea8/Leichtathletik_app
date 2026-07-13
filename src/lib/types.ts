// Typen für die Datenbank-Zeilen (siehe supabase/schema.sql)

export type GroupRole = 'coach' | 'athlete';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

/** Die Gruppenmitgliedschaft des eingeloggten Users (v1: genau eine Gruppe). */
export interface Membership {
  role: GroupRole;
  group: Group;
}

export interface Training {
  id: string;
  group_id: string;
  starts_at: string;
  location: string;
  program: string | null;
  equipment_note: string | null;
  cancelled: boolean;
  series_id: string | null;
  created_by: string;
  created_at: string;
}

export type SignupStatus = 'in' | 'out';

export interface Signup {
  training_id: string;
  profile_id: string;
  status: SignupStatus;
  note: string | null;
  updated_at: string;
}

export type DisciplineCategory = 'sprint' | 'lauf' | 'huerden' | 'sprung' | 'wurf' | 'mehrkampf';
export type DisciplineUnit = 'seconds' | 'meters' | 'points';

export const CATEGORY_LABELS: Record<DisciplineCategory, string> = {
  sprint: 'Sprint',
  lauf: 'Lauf',
  huerden: 'Hürden',
  sprung: 'Sprung',
  wurf: 'Wurf',
  mehrkampf: 'Mehrkampf',
};

export interface Discipline {
  id: string;
  name: string;
  category: DisciplineCategory;
  unit: DisciplineUnit;
  lower_is_better: boolean;
  sort_order: number;
}

export interface Performance {
  id: string;
  profile_id: string;
  discipline_id: string;
  value: number;
  performed_on: string; // ISO-Datum, z.B. "2026-07-12"
  context: 'training' | 'competition';
  note: string | null;
  created_at: string;
}

export interface Competition {
  id: string;
  group_id: string;
  name: string;
  location: string | null;
  held_on: string;
  registration_deadline: string | null;
  link: string | null;
  created_by: string;
  created_at: string;
}
