import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'vk_portal_token';

export async function savePortalToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getPortalToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearPortalToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
