import { ReactNode, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius } from '@/constants/theme';

export function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text} {required ? <Text style={{ color: colors.red }}>✶</Text> : null}
    </Text>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.textarea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.g400}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  );
}

export function DateField({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const label = value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={{ color: colors.nearBlack, fontSize: 12 }}>{label}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, d) => {
            setOpen(Platform.OS === 'ios');
            if (d) onChange(d);
          }}
        />
      )}
    </>
  );
}

export function SelectField({
  value,
  options,
  onChange,
  placeholder = '— Select —',
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={styles.input} onPress={() => setOpen((o) => !o)}>
        <Text style={{ color: value ? colors.nearBlack : colors.g400, fontSize: 12 }}>{value || placeholder}</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={styles.dropdownItem}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}>
              <Text style={{ fontSize: 12, color: colors.nearBlack }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function FormError({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

export function ModalButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.buttonRow}>{children}</View>;
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.ghostBtn} onPress={onPress}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  color = colors.navy,
  loading,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Pressable style={[styles.primaryBtn, { backgroundColor: color }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.nearBlack,
    minHeight: 34,
    justifyContent: 'center',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  dropdown: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    maxHeight: 220,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  errorBox: { backgroundColor: colors.redLt, borderWidth: 1.5, borderColor: colors.redBd, borderLeftWidth: 3, borderLeftColor: colors.red, borderRadius: radius.sm, padding: 10, marginTop: 10 },
  errorText: { color: colors.redDk, fontWeight: '600', fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18, justifyContent: 'flex-end' },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  ghostBtnText: { color: colors.g400, fontSize: 12, fontWeight: '600' },
  primaryBtn: { borderRadius: 9, paddingHorizontal: 20, paddingVertical: 11, minWidth: 120, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
