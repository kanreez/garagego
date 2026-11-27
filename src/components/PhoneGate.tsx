import { ReactNode, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { authStyles as styles } from "../constants/authStyles";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { getMe, savePhone } from "../services/account";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";
import { PhoneField } from "./PhoneField";
import { ScreenWrapper } from "./ScreenWrapper";

export function PhoneGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [missingFor, setMissingFor] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getMe()
      .then((me) => !cancelled && setMissingFor("phone" in me && !me.phone ? userId : null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || missingFor !== userId) return <>{children}</>;
  return <PhoneStep onDone={() => setMissingFor(null)} />;
}

function PhoneStep({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { logout } = useAuth();
  const [phone, setPhone] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!phone.trim()) return setError(t("phone.required"));
    try {
      setSaving(true);
      setError("");
      await savePhone(phone, isPublic);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper scroll style={styles.page}>
      <BrandMark size={48} />
      <View style={styles.intro}>
        <Text style={styles.title}>{t("phone.stepTitle")}</Text>
        <Text style={styles.subtitle}>{t("phone.stepText")}</Text>
      </View>
      <View style={styles.form}>
        <PhoneField phone={phone} onPhoneChange={setPhone} isPublic={isPublic} onPublicChange={setIsPublic} error={error} onSubmitEditing={save} />
        <Button title={t("phone.save")} variant="accent" loading={saving} onPress={save} style={styles.submit} />
      </View>
      <Pressable onPress={() => logout().catch(() => {})} accessibilityRole="button">
        <Text style={styles.footer}>{t("phone.logOut")}</Text>
      </Pressable>
    </ScreenWrapper>
  );
}
