import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, doorPaints, radius, spacing, themed, typography } from "../constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type IconTileProps = {
  icon: IconName;
  size?: number;
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const iconOn = (bg: string) => (bg === colors.accent ? colors.onAccent : bg === colors.cta ? colors.onCta : undefined);

export function IconTile({ icon, size = 44, bg = colors.sand, color, style }: IconTileProps) {
  const fg = color ?? iconOn(bg) ?? colors.ink;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.round(size * 0.34), backgroundColor: bg },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={fg} />
    </View>
  );
}

export function RowAction({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  if (!onPress) {
    return (
      <View style={styles.rowAction} accessibilityElementsHidden importantForAccessibility="no">
        <Ionicons name={icon} size={20} color={colors.ink} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.rowAction, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}

export function Tag({
  label,
  color = colors.ink,
  bg,
  outline,
  icon,
}: {
  label: string;
  color?: string;
  bg?: string;
  outline?: boolean;
  icon?: IconName;
}) {
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: bg ?? "transparent" },
        outline && { borderWidth: 1.5, borderColor: color },
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={color} /> : null}
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

export function Headline({ title, subline, style }: { title: string; subline?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.headline, style]}>
      <Text style={styles.display} accessibilityRole="header">
        {title}
      </Text>
      {subline ? <Text style={styles.subline}>{subline}</Text> : null}
    </View>
  );
}

export function LogoTile({ size = 40 }: { size?: number }) {
  const ribs = Math.max(2, Math.floor((size - 12) / 6));
  return (
    <View
      style={[styles.tile, styles.logo, { width: size, height: size, borderRadius: Math.max(3, Math.round(size * 0.08)) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.logoLintel, { height: Math.round(size * 0.14) }]} />
      {Array.from({ length: ribs }, (_, i) => (
        <View key={i} style={[styles.logoRib, { top: Math.round(size * 0.14) + 4 + i * 6 }]} />
      ))}
      <Text style={[styles.logoG, { fontSize: Math.round(size * 0.6), lineHeight: Math.round(size * 0.72) }]}>G</Text>
    </View>
  );
}

export function SectionTitle({ children, muted }: { children: string; muted?: boolean }) {
  return <Text style={[styles.section, muted && { color: colors.textMuted }]}>{children}</Text>;
}

const styles = themed(() => StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
  rowAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tagText: { ...typography.label, fontSize: 12, lineHeight: 15, flexShrink: 1 },
  section: { ...typography.h2, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  headline: { gap: spacing.sm },
  display: { ...typography.display, color: colors.ink },
  subline: { ...typography.subline, color: colors.textMuted },
  logo: { backgroundColor: doorPaints[1], overflow: "hidden", justifyContent: "flex-end" },
  logoLintel: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(0, 0, 0, 0.22)" },
  logoRib: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(0, 0, 0, 0.16)" },
  logoG: { ...typography.stencil, color: colors.white, includeFontPadding: false },
}));
