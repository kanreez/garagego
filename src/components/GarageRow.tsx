import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { placeLabel, SIZE_META } from "../constants/garages";
import { colors, typography } from "../constants/theme";
import { t, useT } from "../i18n";
import { Garage } from "../types/garage";
import { formatMoney } from "../utils/booking";
import { openDirections } from "../utils/maps";
import { RowAction } from "./Bits";
import { DoorTile } from "./DoorTile";
import { RatingLine } from "./Stars";

type Props = {
  garage: Garage;
  distanceKm?: number | null;
  onPress?: () => void;
};

function formatKm(km: number) {
  return km < 1 ? t("units.m", { n: Math.round(km * 1000) }) : t("units.km", { n: km.toFixed(1) });
}

export function GarageRow({ garage: g, distanceKm, onPress }: Props) {
  useT();
  const app = g.access === "app";
  const where = distanceKm != null ? `${placeLabel(g)}, ${formatKm(distanceKm)}` : placeLabel(g);
  const spec = `${SIZE_META[g.size].label}, ${(g.covered ? t("garage.covered") : t("garage.openAir")).toLowerCase()}`;
  const info = (
    <>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {g.title}
        </Text>
        <Text style={styles.caption} numberOfLines={1}>
          {where}, {spec.toLowerCase()}
        </Text>
        <View style={styles.badges}>
          <RatingLine rating={g.rating} />
          {app ? <Ionicons name="phone-portrait" size={14} color={colors.accentDeep} accessibilityElementsHidden importantForAccessibility="no" /> : null}
        </View>
      </View>
      <View style={styles.prices}>
        <Text style={styles.price}>{formatMoney(g.price_hour)}</Text>
        <Text style={styles.caption}>{t("garage.perHour")}</Text>
        <Text style={[styles.caption, styles.tabular]}>{t("garage.aDay", { price: formatMoney(g.price_day) })}</Text>
      </View>
    </>
  );
  return (
    <View style={styles.row}>
      <DoorTile garageId={g.id} size={g.size} width={58} height={66} />
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${g.title}, ${formatMoney(g.price_hour)} ${t("garage.perHour")}${app ? `, ${t("garage.opensFromPhone")}` : ""}`}
          onPress={onPress}
          style={({ pressed }) => [styles.info, pressed && { opacity: 0.75 }]}
        >
          {info}
        </Pressable>
      ) : (
        <View style={styles.info}>{info}</View>
      )}
      <RowAction icon="navigate" label={t("garage.directionsTo", { title: g.title })} onPress={() => openDirections(g)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  body: { flex: 1, gap: 2 },
  title: { ...typography.h3, color: colors.ink },
  caption: { ...typography.caption, color: colors.textMuted },
  badges: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 },
  prices: { alignItems: "flex-end" },
  price: { ...typography.figureSm, color: colors.ink },
  tabular: typography.tabular,
});
