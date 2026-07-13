// Datums- und Wert-Formatierung, überall in der App wiederverwendet.

const dateTimeFormat = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateFormat = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "Di., 14. Juli, 18:30" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "Sa., 12. Juli 2026" */
export function formatDate(isoDate: string): string {
  return dateFormat.format(parseDateOnly(isoDate));
}

/** "12.07.2026" */
export function formatShortDate(isoDate: string): string {
  return shortDateFormat.format(parseDateOnly(isoDate));
}

/** Ganze Tage von heute bis zum Datum (negativ = vergangen). */
export function daysUntil(isoDate: string): number {
  const target = parseDateOnly(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Reines Datum ("2026-07-12") als lokale Zeit parsen (nicht UTC). */
export function parseDateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Date als "JJJJ-MM-TT" in lokaler Zeit (nicht UTC, sonst Off-by-one). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Leistungswert formatieren:
 * - Zeiten unter 60 s: "11.42 s", darüber "2:04.31"
 * - Weiten/Höhen: "6.12 m"
 * - Punkte: "5432 P."
 */
export function formatPerformanceValue(value: number, unit: 'seconds' | 'meters' | 'points'): string {
  if (unit === 'seconds') {
    if (value < 60) {
      return `${value.toFixed(2)} s`;
    }
    const minutes = Math.floor(value / 60);
    const seconds = value - minutes * 60;
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }
  if (unit === 'meters') {
    return `${value.toFixed(2)} m`;
  }
  return `${Math.round(value)} P.`;
}

/**
 * Eingabe eines Leistungswerts parsen. Akzeptiert:
 * - "11.42" oder "11,42" (Sekunden bzw. Meter)
 * - "2:04.31" (Minuten:Sekunden, nur bei Zeiten)
 * Gibt null zurück, wenn die Eingabe ungültig ist.
 */
export function parsePerformanceValue(
  input: string,
  unit: 'seconds' | 'meters' | 'points'
): number | null {
  const text = input.trim().replace(',', '.');
  if (!text) return null;

  if (unit === 'seconds' && text.includes(':')) {
    const [minutesPart, secondsPart] = text.split(':');
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60 || seconds < 0) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}
