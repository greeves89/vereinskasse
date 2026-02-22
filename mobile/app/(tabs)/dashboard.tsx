/**
 * Dashboard tab – shows member status, upcoming events, payment reminders.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getPortalToken, clearPortalToken } from '../../src/lib/storage';
import { portalApi, MemberPortalData } from '../../src/lib/api';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtEuro(val: number | null | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
        {isActive ? 'Aktiv' : status}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = await getPortalToken();
      if (!token) { router.replace('/'); return; }
      const result = await portalApi.getData(token);
      setData(result);
    } catch {
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleLogout() {
    await clearPortalToken();
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!data) return null;

  const { member, events, payment_reminders } = data;
  const upcomingEvents = events.slice(0, 3);
  const openReminders = payment_reminders.filter((r) => r.status === 'pending');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
    >
      {/* Member card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
          <StatusBadge status={member.status} />
        </View>
        {member.member_number && (
          <Text style={styles.metaText}>Mitgl.-Nr.: {member.member_number}</Text>
        )}
        {member.member_since && (
          <Text style={styles.metaText}>Mitglied seit: {fmtDate(member.member_since)}</Text>
        )}
        {member.group && (
          <Text style={styles.metaText}>Gruppe: {member.group.name}</Text>
        )}
        {member.beitrag_monthly != null && (
          <Text style={styles.metaText}>Monatsbeitrag: {fmtEuro(member.baitrag_monthly)}</Text>
        )}
      </View>

      {/* Payment reminders */}
      {openReminders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Offene Zahlungen</Text>
          {openReminders.map((r) => (
            <View key={r.id} style={[styles.card, styles.warningCard]}>
              <Text style={styles.warningText}>{fmtEuro(r.amount)}</Text>
              <Text style={styles.metaText}>Fällig: {fmtDate(r.due_date)}</Text>
              {r.notes && <Text style={styles.metaText}>{r.notes}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Upcoming events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Bevorstehende Veranstaltungen</Text>
        {upcomingEvents.length === 0 ? (
          <Text style={styles.emptyText}>Keine bevorstehenden Veranstaltungen.</Text>
        ) : (
          upcomingEvents.map((ev) => (
            <View key={ev.id} style={styles.card}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <Text style={styles.metaText}>{fmtDate(ev.event_date)}</Text>
              {ev.location && <Text style={styles.metaText}>📍 {ev.location}</Text>}
            </View>
          ))
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  warningCard: {
    borderColor: '#f59e0b',
    backgroundColor: '#1a1a0e',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memberName: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#064e3b' },
  badgeInactive: { backgroundColor: '#374151' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextActive: { color: '#34d399' },
  badgeTextInactive: { color: '#9ca3af' },
  metaText: { fontSize: 13, color: '#9ca3af', marginTop: 3 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#e5e7eb', marginBottom: 4 },
  warningText: { fontSize: 18, fontWeight: '700', color: '#f59e0b', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  logoutButton: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#9ca3af', fontSize: 15 },
});
