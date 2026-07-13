// Web-Variante (nur für die Entwicklung im Browser relevant) —
// auf iOS/Android lädt Metro stattdessen date-time-field.native.tsx.
import { TextField } from '@/components/ui/text-field';

type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  /** 'datetime' für Trainings, 'date' für Wettkampfdaten */
  mode?: 'datetime' | 'date';
};

export function DateTimeField({ label, value, onChange, mode = 'datetime' }: DateTimeFieldProps) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const text =
    mode === 'date'
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return (
    <TextField
      label={`${label} (${mode === 'date' ? 'JJJJ-MM-TT' : 'JJJJ-MM-TT HH:MM'})`}
      defaultValue={text}
      autoCorrect={false}
      onChangeText={(input) => {
        const parsed = new Date(input.replace(' ', 'T'));
        if (!Number.isNaN(parsed.getTime())) onChange(parsed);
      }}
    />
  );
}
