import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Tag } from "../components/Bits";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { Stars } from "../components/Stars";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";
import { notify } from "../components/Toast";
import { colors, radius, spacing, typography } from "../constants/theme";
import { useAsync } from "../hooks/useAsync";
import { getLang, t, TKey, useT } from "../i18n";
import {
  AdminGarage,
  AdminReview,
  AdminUser,
  adminDeleteGarage,
  adminDeleteReview,
  adminDeleteUser,
  adminGarages,
  adminOverview,
  adminReviews,
  adminSetBlocked,
  adminSetGarageHidden,
  adminUsers,
} from "../services/admin";
import { formatCents, formatDuration } from "../utils/booking";

type Section = "overview" | "garages" | "users" | "reviews" | "devices";

const SECTIONS: { key: Section; label: TKey }[] = [
  { key: "overview", label: "admin.tabOverview" },
  { key: "garages", label: "admin.tabGarages" },
  { key: "users", label: "admin.tabUsers" },
  { key: "reviews", label: "admin.tabReviews" },
  { key: "devices", label: "admin.tabDevices" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(getLang() === "bg" ? "bg-BG" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

const matches = (query: string, ...fields: (string | null | undefined)[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
};

export default function Admin() {
  useT();
  const [section, setSection] = useState<Section>("overview");

  return (
    <ScreenWrapper scroll style={styles.page}>
      <Header title={t("admin.title")} subtitle={t("admin.subtitle")} back backTo="/profile" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={styles.tabs}>
        {SECTIONS.map((s) => (
          <Chip key={s.key} label={t(s.label)} selected={section === s.key} onPress={() => setSection(s.key)} />
        ))}
      </ScrollView>
      {section === "overview" ? <Overview /> : null}
      {section === "garages" ? <Garages /> : null}
      {section === "users" ? <Users /> : null}
      {section === "reviews" ? <Reviews /> : null}
      {section === "devices" ? <Devices /> : null}
    </ScreenWrapper>
  );
}

function Overview() {
  useT();
  const { data, loading, error, reload } = useAsync(adminOverview);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  return (
    <View style={styles.stats}>
      <Stat label={t("admin.users")} value={String(data.users)} note={t("admin.blockedCount", { n: data.blocked })} />
      <Stat label={t("admin.garages")} value={String(data.garages)} note={t("admin.hiddenCount", { n: data.hidden })} />
      <Stat label={t("admin.bookingsToday")} value={String(data.bookings_today)} note={t("admin.activeNow", { n: data.active_now })} />
      <Stat label={t("admin.revenue")} value={formatCents(data.revenue_cents)} note={t("admin.fee", { amount: formatCents(data.fee_cents) })} />
    </View>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.caption}>{note}</Text>
    </Card>
  );
}

function Garages() {
  useT();
  const { data, loading, error, reload, setData } = useAsync(adminGarages);
  const [query, setQuery] = useState("");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  const shown = data.filter((g) => matches(query, g.title, g.city, g.area, g.host_name, g.host_username));
  return (
    <View style={styles.list}>
      <Input label={t("admin.search")} placeholder={t("admin.searchGarages")} value={query} onChangeText={setQuery} autoCapitalize="none" />
      {!shown.length ? <EmptyState icon="home-outline" title={t("admin.noGarages")} /> : null}
      {shown.map((g) => (
        <GarageCard
          key={g.id}
          garage={g}
          onChanged={(next) => setData(data.map((x) => (x.id === next.id ? next : x)))}
          onDeleted={() => setData(data.filter((x) => x.id !== g.id))}
        />
      ))}
    </View>
  );
}

function GarageCard({ garage, onChanged, onDeleted }: { garage: AdminGarage; onChanged: (g: AdminGarage) => void; onDeleted: () => void }) {
  useT();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const host = garage.host_id ? garage.host_name || (garage.host_username ? `@${garage.host_username}` : t("admin.noName")) : t("admin.noHost");

  const toggle = async () => {
    try {
      setBusy(true);
      await adminSetGarageHidden(garage.id, !garage.hidden);
      onChanged({ ...garage, hidden: !garage.hidden });
      notify(t(garage.hidden ? "admin.garageShown" : "admin.garageHidden", { title: garage.title }));
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await adminDeleteGarage(garage.id);
      notify(t("admin.garageDeleted", { title: garage.title }));
      onDeleted();
    } catch (e: any) {
      notify(e.message, "error");
      if (garage.ongoing) onChanged({ ...garage, hidden: true });
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card style={styles.item}>
      <Text style={styles.itemTitle}>{garage.title}</Text>
      <Text style={styles.caption}>{[garage.area, garage.city].filter(Boolean).join(", ")}</Text>
      <Text style={styles.body}>
        {t("admin.host", { name: host })}
        {garage.host_username && garage.host_name ? ` · @${garage.host_username}` : ""}
      </Text>
      <View style={styles.tags}>
        {garage.hidden ? <Tag label={t("admin.hidden")} icon="eye-off" bg={colors.sand} /> : null}
        {garage.ongoing ? <Tag label={t("admin.ongoing")} icon="time" bg={colors.successSoft} color={colors.success} /> : null}
      </View>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.body}>{t("admin.deleteGarageConfirm", { title: garage.title })}</Text>
          <View style={styles.actions}>
            <Button title={t("admin.keep")} size="sm" variant="ghost" disabled={busy} onPress={() => setConfirming(false)} />
            <Button title={t("admin.deleteGarageYes")} size="sm" variant="danger" icon="trash" loading={busy} onPress={remove} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            title={garage.hidden ? t("admin.show") : t("admin.hide")}
            icon={garage.hidden ? "eye" : "eye-off"}
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={toggle}
          />
          <Button title={t("admin.delete")} icon="trash-outline" size="sm" variant="ghost" disabled={busy} onPress={() => setConfirming(true)} />
        </View>
      )}
    </Card>
  );
}

function Users() {
  useT();
  const { data, loading, error, reload, setData } = useAsync(adminUsers);
  const [query, setQuery] = useState("");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  const shown = data.filter((u) => matches(query, u.full_name, u.username, u.email, u.phone));
  return (
    <View style={styles.list}>
      <Input label={t("admin.search")} placeholder={t("admin.searchUsers")} value={query} onChangeText={setQuery} autoCapitalize="none" />
      {!shown.length ? <EmptyState icon="people-outline" title={t("admin.noUsers")} /> : null}
      {shown.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          onChanged={(next) => setData(data.map((x) => (x.id === next.id ? next : x)))}
          onDeleted={() => setData(data.filter((x) => x.id !== u.id))}
        />
      ))}
    </View>
  );
}

function UserCard({ user, onChanged, onDeleted }: { user: AdminUser; onChanged: (u: AdminUser) => void; onDeleted: () => void }) {
  useT();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const name = user.full_name || (user.username ? `@${user.username}` : user.email) || t("admin.noName");
  const confirmWord = user.username || user.email || "";

  const toggleBlock = async () => {
    try {
      setBusy(true);
      await adminSetBlocked(user.id, !user.blocked);
      onChanged({ ...user, blocked: !user.blocked });
      notify(t(user.blocked ? "admin.userUnblocked" : "admin.userBlocked", { name }));
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await adminDeleteUser(user.id, typed);
      notify(t("admin.userDeleted", { name }));
      onDeleted();
    } catch (e: any) {
      notify(e.message, "error");
      setBusy(false);
    }
  };

  return (
    <Card style={styles.item}>
      <Text style={styles.itemTitle}>{name}</Text>
      {user.username ? <Text style={styles.handle}>@{user.username}</Text> : null}
      <Text style={styles.body} selectable>
        {[user.email, user.phone].filter(Boolean).join(" · ")}
      </Text>
      <Text style={styles.caption}>
        {t("admin.joined", { date: formatDate(user.created_at) })} · {t("admin.garagesOf", { n: user.garages })}
      </Text>
      <View style={styles.tags}>
        {user.admin ? <Tag label={t("admin.adminTag")} icon="shield-checkmark" bg={colors.accentSoft} /> : null}
        {user.blocked ? <Tag label={t("admin.blocked")} icon="ban" bg={colors.errorSoft} color={colors.errorText} /> : null}
      </View>
      {user.admin ? null : confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.body}>{t("admin.deleteUserConfirm", { name, username: confirmWord })}</Text>
          <Input placeholder={confirmWord} value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} />
          <View style={styles.actions}>
            <Button
              title={t("admin.keep")}
              size="sm"
              variant="ghost"
              disabled={busy}
              onPress={() => {
                setConfirming(false);
                setTyped("");
              }}
            />
            <Button
              title={t("admin.deleteUserYes")}
              size="sm"
              variant="danger"
              icon="trash"
              loading={busy}
              disabled={typed.trim().toLowerCase() !== confirmWord.toLowerCase()}
              onPress={remove}
            />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            title={user.blocked ? t("admin.unblock") : t("admin.block")}
            icon={user.blocked ? "lock-open-outline" : "ban"}
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={toggleBlock}
          />
          <Button title={t("admin.delete")} icon="trash-outline" size="sm" variant="ghost" disabled={busy} onPress={() => setConfirming(true)} />
        </View>
      )}
    </Card>
  );
}

function Reviews() {
  useT();
  const { data, loading, error, reload, setData } = useAsync(adminReviews);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  if (!data.length) return <EmptyState icon="star-outline" title={t("admin.noReviews")} />;
  return (
    <View style={styles.list}>
      {data.map((r) => (
        <ReviewCard key={r.id} review={r} onDeleted={() => setData(data.filter((x) => x.id !== r.id))} />
      ))}
    </View>
  );
}

function ReviewCard({ review, onDeleted }: { review: AdminReview; onDeleted: () => void }) {
  useT();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    try {
      setBusy(true);
      await adminDeleteReview(review.id);
      notify(t("admin.reviewDeleted"));
      onDeleted();
    } catch (e: any) {
      notify(e.message, "error");
      setBusy(false);
    }
  };

  return (
    <Card style={styles.item}>
      <View style={styles.reviewHead}>
        <Stars value={review.rating} />
        <Text style={styles.caption}>{formatDate(review.created_at)}</Text>
      </View>
      <Text style={[styles.body, !review.comment && { color: colors.textMuted }]}>{review.comment || t("admin.noComment")}</Text>
      <Text style={styles.caption}>
        {review.author_name}
        {review.garage_title ? ` · ${t("admin.reviewOn", { title: review.garage_title })}` : ""}
      </Text>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.body}>{t("admin.deleteReviewConfirm")}</Text>
          <View style={styles.actions}>
            <Button title={t("admin.keep")} size="sm" variant="ghost" disabled={busy} onPress={() => setConfirming(false)} />
            <Button title={t("admin.deleteReviewYes")} size="sm" variant="danger" icon="trash" loading={busy} onPress={remove} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title={t("admin.delete")} icon="trash-outline" size="sm" variant="ghost" onPress={() => setConfirming(true)} />
        </View>
      )}
    </Card>
  );
}

function Devices() {
  useT();
  const { data, loading, error, reload, setData } = useAsync(adminGarages);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      adminGarages().then(setData).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [setData]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  const devices = data.filter((g) => g.access === "app");
  if (!devices.length) return <EmptyState icon="hardware-chip-outline" title={t("admin.noDevices")} />;
  return (
    <View style={styles.list}>
      <Text style={styles.caption}>{t("admin.devicesNote")}</Text>
      {devices.map((g) => {
        const seen = g.device_last_seen ? now - new Date(g.device_last_seen).getTime() : null;
        return (
          <Card key={g.id} style={styles.device}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.itemTitle}>{g.title}</Text>
              <Text style={styles.caption}>{[g.area, g.city].filter(Boolean).join(", ")}</Text>
            </View>
            {g.device_online ? (
              <Tag label={t("admin.online")} icon="radio-button-on" bg={colors.successSoft} color={colors.success} />
            ) : (
              <Tag label={seen != null ? t("admin.seenAgo", { time: formatDuration(seen) }) : t("admin.notPaired")} bg={colors.sand} />
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { maxWidth: 760, width: "100%", alignSelf: "center" },
  tabsBar: { flexGrow: 0, marginBottom: spacing.lg },
  tabs: { gap: spacing.sm, alignItems: "center" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 160, gap: 4 },
  statValue: { ...typography.figureSm, color: colors.ink },
  list: { gap: spacing.md },
  item: { gap: spacing.xs },
  itemTitle: { ...typography.h3, color: colors.ink },
  handle: { ...typography.label, color: colors.accentDeep },
  body: { ...typography.body, color: colors.ink },
  caption: { ...typography.caption, color: colors.textMuted },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.xs },
  confirm: { gap: spacing.sm, marginTop: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  device: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
