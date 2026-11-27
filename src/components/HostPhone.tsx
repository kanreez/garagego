import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../constants/theme";
import { useT } from "../i18n";

export function formatPhone(n: string) {
  const m = n.match(/^\+359(\d{2})(\d{3})(\d{3,4})$/);
  return m ? `+359 ${m[1]} ${m[2]} ${m[3]}` : n;
}

export function CallHost({ number }: { number: string }) {
  const { t } = useT();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t("phone.callHost", { number: formatPhone(number) })}
      onPress={() => Linking.openURL(`tel:${number}`).catch(() => {})}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="call-outline" size={16} color={colors.accentDeep} />
      <Text style={styles.number}>{formatPhone(number)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  number: { ...typography.label, color: colors.accentDeep, textDecorationLine: "underline" },
});
