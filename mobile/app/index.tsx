/**
 * Login screen – enter the portal token (deep link or QR code).
 * The admin generates a portal token for each member in VereinsKasse,
 * which the member enters here or scans via QR code.
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { savePortalToken, getPortalToken } from '../src/lib/storage';
import { portalApi } from '../src/lib/api';

export default function LoginScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Auto-login if token is already saved
    getPortalToken().then((saved) => {
      if (saved) {
        portalApi.getData(saved)
          .then(() => router.replace('/(tabs)/dashboard'))
          .catch(() => setChecking(false));
      } else {
        setChecking(false);
      }
    });
  }, []);

  async function handleLogin() {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    try {
      await portalApi.getData(t);
      await savePortalToken(t);
      router.replace('/(tabs)/dashboard');
    } catch {
      Alert.alert('Fehler', 'Ungültiger Zugangscode. Bitte beim Verein nachfragen.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>VereinsKasse</Text>
        <Text style={styles.subtitle}>Mitglieder-App</Text>
        <Text style={styles.hint}>
          Gib deinen persönlichen Zugangscode ein.{'\n'}
          Den Code erhältst du vom Vorstand deines Vereins.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Zugangscode eingeben…"
          placeholderTextColor="#6b7280"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, (!token.trim() || loading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!token.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Anmelden</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#6366f1',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1f1f35',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
