import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Headline } from "../../components/Bits";
import { BrandMark } from "../../components/BrandMark";
import { APP_TAGLINE } from "../../constants/app";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PhoneField } from "../../components/PhoneField";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { authStyles as styles } from "../../constants/authStyles";
import { colors, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";

export default function Register() {
  const { signup } = useAuth();
  const { t } = useT();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phonePublic, setPhonePublic] = useState(true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const phoneError = error === t("phone.required") || error === t("err.phoneInvalid");

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      setInfo("");
      if (!phone.trim()) throw new Error(t("phone.required"));
      const r = await signup({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone, phonePublic, password });
      if (r.needsConfirmation) {
        setInfo(r.username ? t("register.confirmWithUsername", { username: r.username }) : t("register.confirm"));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scroll style={styles.page}>
      <BrandMark size={64} />
      <View style={styles.intro}>
        <Headline title={t("auth.headline")} subline={APP_TAGLINE()} />
        <Text style={styles.title}>{t("register.title")}</Text>
      </View>
      <View style={styles.form}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input label={t("register.firstName")} placeholder={t("register.firstNamePlaceholder")} autoComplete="given-name" value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t("register.lastName")} placeholder={t("register.lastNamePlaceholder")} autoComplete="family-name" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
        <Text style={styles.subtitle}>{t("register.usernameNote")}</Text>
        <Input
          label={t("auth.email")}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <PhoneField phone={phone} onPhoneChange={setPhone} isPublic={phonePublic} onPublicChange={setPhonePublic} error={phoneError ? error : undefined} />
        <Input
          label={t("auth.password")}
          placeholder={t("register.passwordPlaceholder")}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
          error={phoneError ? undefined : error}
        />
        <Button title={t("register.submit")} variant="accent" loading={loading} onPress={onSubmit} style={styles.submit} />
        {info ? <Text style={{ ...typography.label, color: colors.success }}>{info}</Text> : null}
      </View>
      <Text style={styles.footer}>
        {t("register.haveAccount")}{" "}
        <Link href="/login" style={styles.link}>
          {t("register.logIn")}
        </Link>
      </Text>
    </ScreenWrapper>
  );
}
