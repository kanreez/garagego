import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../constants/theme";
import { useT } from "../i18n";
import { Input } from "./Input";

type Props = {
  phone: string;
  onPhoneChange: (v: string) => void;
  isPublic: boolean;
  onPublicChange: (v: boolean) => void;
  error?: string;
  onSubmitEditing?: () => void;
  showChangeNote?: boolean;
};

export function PhoneField({ phone, onPhoneChange, isPublic, onPublicChange, error, onSubmitEditing, showChangeNote = true }: Props) {
  const { t } = useT();
  return (
    <View style={styles.wrap}>
      <Input
        label={t("phone.label")}
        placeholder="+359 88 123 4567"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        value={phone}
        onChangeText={onPhoneChange}
        onSubmitEditing={onSubmitEditing}
        error={error}
        maxLength={20}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel={t("phone.whoSees")} style={styles.choices}>
        <Choice selected={isPublic} onPress={() => onPublicChange(true)} icon="eye-outline" title={t("phone.public")} text={t("phone.publicHint")} />
        <Choice selected={!isPublic} onPress={() => onPublicChange(false)} icon="lock-closed-outline" title={t("phone.private")} text={t("phone.privateHint")} />
      </View>
      {showChangeNote ? <Text style={styles.note}>{t("phone.changeLater")}</Text> : null}
    </View>
  );
}

function Choice({ selected, onPress, icon, title, text }: { selected: boolean; onPress: () => void; icon: "eye-outline" | "lock-closed-outline"; title: string; text: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={18} color={selected ? colors.ink : colors.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.choiceTitle, !selected && { color: colors.textMuted }]}>{title}</Text>
        <Text style={styles.choiceText}>{text}</Text>
      </View>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.accentDeep : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  choices: { gap: spacing.xs },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  choiceOn: { borderColor: colors.ink },
  choiceTitle: { ...typography.label, color: colors.ink },
  choiceText: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted },
});
