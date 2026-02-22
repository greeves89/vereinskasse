import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { getPortalToken } from '../../src/lib/storage';
import { portalApi, MemberPortalData } from '../../src/lib/api';
import { router } from 'expo-router';

type Event = MemberPortalData['events'][number];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const token = await getPortalToken();
    if (!token) { router.replace('/'); return; }
    try {
      const data = await portalApi.getData(token);
      setEvents(data.events);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={events}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Keine Veranstaltungen geplant.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.title}</Text>
            {item.registered && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredText}>Angemeldet</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>📅 {fmtDate(item.event_date)}</Text>
          {item.location && <Text style={styles.meta}>📍 {item.location}</Text>}
          {item.description && <Text style={styles.description}>{item.description}</Text>}
          {item.max_participants != null && (
            <Text style={styles.meta}>
              👥 {item.registration_count} / {item.max_participants} Teilnehmer
            </Text>
          )}
        </View>
      )}
    />
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  date: { fontSize: 13, color: '#6366f1', marginBottom: 4 },
  meta: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  description: { fontSize: 13, color: '#e5e7eb', marginTop: 6, lineHeight: 20 },
  registeredBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  registeredText: { fontSize: 11, color: '#34d399', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 60, fontStyle: 'italic' },
});
