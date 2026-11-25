import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SIZE_META } from "../constants/garages";
import { colors, doorPaint, typography } from "../constants/theme";
import { useT } from "../i18n";
import { GarageSize } from "../types/garage";

type Props = {
  garageId: string;
  size: GarageSize;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

// A garage's painted door, as in the rows behind the panel blocks: its own paint for good, the
// corrugated sheet as horizontal ribs, and the size stencilled on it (М / С / Г, or S / M / L).
// Decorative: the size and title are always spelled out next to it for screen readers.
export function DoorTile({ garageId, size, width = 52, height = 60, style }: Props) {
  useT(); // the stencil follows the language
  const ribs = Math.max(3, Math.floor((height - 14) / 6));
  const letter = SIZE_META[size].label.charAt(0).toUpperCase();
  return (
    <View
      style={[styles.door, { width, height, backgroundColor: doorPaint(garageId) }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.lintel} />
      {Array.from({ length: ribs }, (_, i) => (
        <View key={i} style={[styles.rib, { top: 10 + i * 6 }]} />
      ))}
      <Text style={[styles.stencil, { fontSize: Math.round(height * 0.42), lineHeight: Math.round(height * 0.5) }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  door: { borderRadius: 3, overflow: "hidden", alignItems: "center", justifyContent: "flex-end", paddingBottom: 4 },
  // The shadowed top edge where the door meets the frame
  lintel: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: "rgba(0, 0, 0, 0.22)" },
  rib: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(0, 0, 0, 0.16)" },
  stencil: { ...typography.stencil, color: colors.white, includeFontPadding: false },
});
