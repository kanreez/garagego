import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, doorPaints, radius, shadow, spacing, typography } from "../constants/theme";

// Small shared pieces of the design system (DESIGN.md)

type IconName = ComponentProps<typeof Ionicons>["name"];

type IconTileProps = {
  icon: IconName;
  size?: number; // 40–56
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

// Graphite takes light icons, ochre takes dark ones
const ICON_ON: Record<string, string> = { [colors.accent]: colors.onAccent, [colors.cta]: colors.onCta };

// Rounded-square tile holding an icon
export function IconTile({ icon, size = 44, bg = colors.sand, color, style }: IconTileProps) {
  const fg = color ?? ICON_ON[bg] ?? colors.ink;
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

// 44px round outlined button at the right end of a tappable row
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

// Red "do this now" block. Only for urgent / emergency.
export function UrgentBanner({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.urgent, style]} accessibilityRole="alert">
      <View style={styles.urgentTile}>
        <Ionicons name="warning" size={22} color={colors.error} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.urgentText}>{text}</Text>
      </View>
    </View>
  );
}

// Small pill: tinted fill or outlined in a colour
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

// Screen intro: big bold white headline with a short orange subline under it
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

// The logo: one ochre garage door with a stencilled G, the row's door everybody recognises
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

// Section title used between cards
export function SectionTitle({ children, muted }: { children: string; muted?: boolean }) {
  return <Text style={[styles.section, muted && { color: colors.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
  // Outlined, not filled: a list repeats it on every row, so it must stay quieter than the prices
  rowAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  urgent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.float,
  },
  urgentTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentText: { ...typography.h3, color: colors.white },
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
});
