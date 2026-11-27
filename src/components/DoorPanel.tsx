import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { colors, doorPaints, radius, spacing, themed, typography } from "../constants/theme";

export type DoorVisual = "closed" | "opening" | "open" | "closing" | "error";

type Props = {
  visual: DoorVisual;
  restingOpen: boolean;
  caption: string;
  paint?: string;
  stencil?: string;
};

const SLATS = 7;
const DOOR_HEIGHT = 168;
const QUEUED_LIFT = 6;
const RAIL = 14;
const ROLL_MS = 700;

export function DoorPanel({ visual, restingOpen, caption, paint = doorPaints[0], stencil }: Props) {
  const [lift] = useState(() => new Animated.Value(restingOpen ? DOOR_HEIGHT - RAIL : 0));
  const [shimmer] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  const previous = useRef<DoorVisual>(visual);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const target =
      visual === "open" ? DOOR_HEIGHT - RAIL
      : visual === "closing" ? DOOR_HEIGHT - RAIL - QUEUED_LIFT
      : visual === "opening" ? QUEUED_LIFT
      : visual === "error" ? (restingOpen ? DOOR_HEIGHT - RAIL : 0)
      : 0;

    if (reduceMotion) {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(lift, { toValue: target, duration: 0, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }

    const roll = visual === "open" || visual === "closed" || visual === "error";
    const move = Animated.timing(lift, {
      toValue: target,
      duration: roll ? ROLL_MS : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (visual === "error") {
      Animated.sequence([
        move,
        Animated.sequence([10, -8, 6, -3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true }))),
      ]).start();
    } else {
      move.start();
    }
  }, [visual, restingOpen, reduceMotion, lift, shake, fade]);

  const waiting = visual === "opening" || visual === "closing";
  useEffect(() => {
    if (!waiting || reduceMotion) {
      shimmer.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [waiting, reduceMotion, shimmer]);

  useEffect(() => {
    const was = previous.current;
    previous.current = visual;
    if (Platform.OS === "web" || was === visual) return;
    const done = (was === "opening" && visual === "open") || (was === "closing" && visual === "closed");
    if (done) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (visual === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [visual]);

  const isError = visual === "error";

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.frame, { opacity: fade, transform: [{ translateX: shake }] }]}>
        <View style={styles.bay}>
          <Animated.View
            style={[styles.floorLine, { opacity: lift.interpolate({ inputRange: [0, DOOR_HEIGHT * 0.6, DOOR_HEIGHT - RAIL], outputRange: [0, 0.4, 1] }) }]}
          />
        </View>

        <Animated.View style={[styles.door, { transform: [{ translateY: Animated.multiply(lift, -1) }] }]}>
          {Array.from({ length: SLATS }, (_, i) => (
            <View key={i} style={[styles.slat, { backgroundColor: paint }]}>
              <Animated.View style={[styles.slatShine, { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.22, 0.45] : [0.22, 0.06] }) }]} />
            </View>
          ))}
          {stencil ? <Text style={styles.stencil}>{stencil}</Text> : null}
          <View style={styles.handle} />
        </Animated.View>
        <View style={styles.lintel} />
      </Animated.View>

      <Text
        style={[styles.caption, isError && { color: colors.errorText }]}
        accessibilityLiveRegion="polite"
        accessibilityRole={isError ? "alert" : undefined}
      >
        {caption}
      </Text>
    </View>
  );
}

const SLAT_GAP = 2;
const BAY = "#2B2F33";
const SLAT_HEIGHT = (DOOR_HEIGHT - SLAT_GAP * (SLATS - 1)) / SLATS;

const styles = themed(() => StyleSheet.create({
  wrap: { gap: spacing.sm },
  frame: {
    height: DOOR_HEIGHT + 10,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.ink,
    backgroundColor: BAY,
    overflow: "hidden",
  },
  lintel: { position: "absolute", top: 0, left: 0, right: 0, height: 10, backgroundColor: colors.ink },
  bay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, justifyContent: "flex-end", paddingHorizontal: 18, paddingBottom: 14 },
  floorLine: { height: 3, borderRadius: 2, backgroundColor: colors.cta, boxShadow: "0px 6px 12px rgba(226, 162, 58, 0.45)" },
  door: { height: DOOR_HEIGHT, gap: SLAT_GAP },
  slat: { height: SLAT_HEIGHT, borderRadius: 1, overflow: "hidden" },
  slatShine: { height: 2, backgroundColor: colors.white },
  stencil: { ...typography.stencil, position: "absolute", top: 40, alignSelf: "center", fontSize: 64, lineHeight: 76, color: colors.white, includeFontPadding: false },
  handle: { position: "absolute", bottom: 8, alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  caption: { ...typography.h3, color: colors.ink, ...typography.tabular },
}));
