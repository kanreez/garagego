import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, themed } from "../constants/theme";
import { useIsWide } from "../hooks/useIsWide";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ScreenWrapper({
  children,
  scroll = false,
  padded = true,
  style,
  edges = ["top", "left", "right"],
  refreshing,
  onRefresh,
}: Props) {
  const wide = useIsWide();
  const padding = padded ? (wide ? styles.paddedWide : styles.padded) : null;
  const widthCap = wide ? styles.wide : null;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, wide && styles.scrollContentWide, widthCap, padding, style]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, widthCap, padding, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 120 },
  scrollContentWide: { paddingBottom: spacing.xxl },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  paddedWide: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl },
  wide: { width: "100%", maxWidth: 1160, alignSelf: "center" },
}));
