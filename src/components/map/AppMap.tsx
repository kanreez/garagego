import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors, doorPaint, radius, themed, typography } from "../../constants/theme";
import { AppMapProps, DEFAULT_ZOOM } from "./types";

export function AppMap({ center, zoom = DEFAULT_ZOOM, recenterKey, pins = [], selectedId, onSelectPin, picked, pickedPaint, onPick, fitToPins, interactive = true, style }: AppMapProps) {
  const ref = useRef<MapView>(null);
  const delta = 360 / 2 ** zoom;
  const region = { latitude: center.latitude, longitude: center.longitude, latitudeDelta: delta, longitudeDelta: delta };

  const fitTo = fitToPins && pins.length > 1 ? pins : null;
  const fitKey = fitTo?.map((p) => `${p.latitude},${p.longitude}`).join("|") ?? "";

  const frame = () => {
    if (fitTo) {
      ref.current?.fitToCoordinates(
        fitTo.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: { top: 60, right: 48, bottom: 48, left: 48 }, animated: true }
      );
    } else {
      ref.current?.animateToRegion({ latitude: center.latitude, longitude: center.longitude, latitudeDelta: delta, longitudeDelta: delta }, 300);
    }
  };

  useEffect(() => {
    frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.latitude, center.longitude, delta, fitKey, recenterKey]);

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onMapReady={frame}
        onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate) : undefined}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {pins.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => onSelectPin?.(p.id)}
              zIndex={selected ? 2 : 1}
            >
              <View style={[styles.pill, selected && { borderColor: doorPaint(p.id) }]}>
                <View style={[styles.swatch, { backgroundColor: doorPaint(p.id) }]} />
                <Text style={styles.pillText}>{p.label}</Text>
              </View>
            </Marker>
          );
        })}
        {picked ? (
          <Marker
            coordinate={picked}
            draggable={!!onPick}
            onDragEnd={onPick ? (e) => onPick(e.nativeEvent.coordinate) : undefined}
            pinColor={pickedPaint ?? colors.ink}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: radius.lg, backgroundColor: colors.sand },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
  },
  swatch: { width: 12, height: 14, borderRadius: 2 },
  pillText: { ...typography.label, fontSize: 13, color: colors.onInk },
}));
