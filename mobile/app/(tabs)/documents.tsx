import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getPortalToken } from '../../src/lib/storage';
import { portalApi, MemberPortalData } from '../../src/lib/api';
import { router } from 'expo-router';

type Doc = MemberPortalData['documents'][number];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE');
}

function fileIcon(type: string): string {
  if (type === 'application/pdf' || type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  if (type.includes('word') || type.includes('doc')) return '📝';
  return '📁';
}

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const token = await getPortalToken();
    if (!token) { router.replace('/'); return; }
    try {
      const data = await portalApi.getData(token);
      setDocs(data.documents);
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
      data={docs}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Keine Dokumente verfügbar.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.icon}>{fileIcon(item.file_type)}</Text>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>Hochgeladen: {fmtDate(item.created_at)}</Text>
            </View>
          </View>
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#e5e7eb' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 60, fontStyle: 'italic' },
});
