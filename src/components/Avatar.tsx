import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../constants/theme";

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

export function Avatar({ uri, name, size = 44 }: Props) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.base, box]} contentFit="cover" transition={150} />;
  }
  return (
    <View style={[styles.base, styles.fallback, box]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.sand, overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  initials: { fontFamily: fonts.bold, color: colors.onAccent },
});
