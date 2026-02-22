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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const [member, setMember] = useState<MemberPortalData['member'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const token = await getPortalToken();
    if (!token) { router.replace('/'); return; }
    try {
      const data = await portalApi.getData(token);
      setMember(data.member);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function handleLogout() {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await clearPortalToken();
          router.replace('/');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!member) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {member.first_name[0]}{member.last_name[0]}
        </Text>
      </View>
      <Text style={styles.name}>{member.first_name} {member.last_name}</Text>

      {/* Details */}
      <View style={styles.card}>
        <Row label="Mitgliedsnummer" value={member.member_number} />
        <Row label="E-Mail" value={member.email} />
        <Row label="Telefon" value={member.phone} />
        <Row label="Mitglied seit" value={member.member_since
          ? new Date(member.member_since).toLocaleDateString('de-DE')
          : null
        } />
        <Row label="Gruppe" value={member.group?.name} />
        <Row label="Status" value={member.status === 'active' ? 'Aktiv' : member.status} />
        {member.beitrag_monthly != null && (
          <Row
            label="Monatsbeitrag"
            value={new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(member.beitrag_monthly)}
          />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  card: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d4e',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4e',
  },
  label: { fontSize: 13, color: '#6b7280', flex: 1 },
  value: { fontSize: 13, color: '#e5e7eb', flex: 1.5, textAlign: 'right' },
  logoutButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#9ca3af', fontSize: 15 },
});
