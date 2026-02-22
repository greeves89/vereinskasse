import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2d2d4e',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Übersicht',
          tabBarLabel: 'Übersicht',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
          headerTitle: 'Meine Übersicht',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Veranstaltungen',
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
          headerTitle: 'Veranstaltungen',
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Dokumente',
          tabBarLabel: 'Dokumente',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📄</Text>,
          headerTitle: 'Vereinsdokumente',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
          headerTitle: 'Mein Profil',
        }}
      />
    </Tabs>
  );
}
