import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useIsWide } from "../../hooks/useIsWide";
import { useT } from "../../i18n";
import { Coords, getCurrentLocation } from "../../utils/location";
import { Button } from "../Button";
import { notify } from "../Toast";
import { AppMap } from "./AppMap";

export type MapFocus = { at: Coords; zoom: number; id: number };

type Props = {
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
  fallbackCenter: Coords;
  zoom?: number;
  focus?: MapFocus | null;
  pinLabel?: string | null;
  onLocate?: (coords: Coords) => void;
};

export function LocationPicker({ value, onChange, fallbackCenter, zoom = 16, focus, pinLabel, onLocate }: Props) {
  const { t } = useT();
  const wide = useIsWide();
  const [initialPin] = useState(value);
  const [located, setLocated] = useState<{ at: Coords; area: Coords } | null>(null);
  const [locating, setLocating] = useState(false);
  const center = focus
    ? focus.at
    : located?.area === fallbackCenter ? located.at : initialPin && !located ? initialPin : fallbackCenter;

  const locate = async () => {
    try {
      setLocating(true);
      const here = await getCurrentLocation();
      if (onLocate) {
        onLocate(here);
      } else {
        setLocated({ at: here, area: fallbackCenter });
        onChange(here);
      }
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View>
        <AppMap
          center={center}
          zoom={focus ? focus.zoom : zoom}
          recenterKey={focus?.id}
          picked={value}
          onPick={onChange}
          style={{ height: wide ? 320 : 260 }}
        />
        {!value ? (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>{t("map.tapHint")}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <Button title={t("map.useLocation")} icon="locate" size="sm" variant="secondary" loading={locating} onPress={locate} />
        {value ? <Button title={t("map.removePin")} size="sm" variant="ghost" onPress={() => onChange(null)} /> : null}
      </View>
      <Text style={styles.caption}>
        {!value
          ? t("map.pinHint")
          : pinLabel
            ? t("map.pinAtPlace", { place: pinLabel })
            : t("map.pinAt", { lat: value.latitude.toFixed(5), lng: value.longitude.toFixed(5) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: "absolute",
    top: spacing.sm,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  hintText: { ...typography.label, fontSize: 13, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  caption: { ...typography.caption, color: colors.textMuted },
});
