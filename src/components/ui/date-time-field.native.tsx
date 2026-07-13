// iOS/Android-Variante — die Web-Variante liegt in date-time-field.tsx
// (Metro wählt automatisch die .native-Datei auf dem Handy).
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  /** 'datetime' für Trainings, 'date' für Wettkampfdaten */
  mode?: 'datetime' | 'date';
};

const formatter = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit' });

export function DateTimeField({ label, value, onChange, mode = 'datetime' }: DateTimeFieldProps) {
  const theme = useTheme();

  // Android: native Dialoge nacheinander öffnen (Datum, dann Zeit)
  if (Platform.OS === 'android') {
    function openAndroidPicker() {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          if (mode === 'date') {
            onChange(date);
            return;
          }
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, dateTime) => {
              if (timeEvent.type === 'set' && dateTime) onChange(dateTime);
            },
          });
        },
      });
    }

    return (
      <View style={styles.container}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
        <Pressable
          onPress={openAndroidPicker}
          style={[
            styles.androidButton,
            { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          ]}>
          <ThemedText>
            {formatter.format(value)}
            {mode === 'datetime' ? `, ${timeFormatter.format(value)}` : ''}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  // iOS: kompakte Inline-Picker
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.iosRow}>
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          onChange={(_event, date) => date && onChange(date)}
        />
        {mode === 'datetime' && (
          <DateTimePicker
            value={value}
            mode="time"
            display="compact"
            onChange={(_event, date) => date && onChange(date)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  androidButton: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    minHeight: 48,
  },
  iosRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
