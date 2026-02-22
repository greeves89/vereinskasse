/**
 * API client for the VereinsKasse member portal.
 * Uses the existing /api/v1/portal/:token endpoints.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vereinskasse.example.com/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'vk_portal_token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ── Member Portal API ─────────────────────────────────────────────────────────

export interface MemberPortalData {
  member: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    member_since: string | null;
    member_number: string | null;
    status: string;
    beitrag_monthly: number | null;
    iban: string | null;
    group: { id: number; name: string } | null;
  };
  events: {
    id: number;
    title: string;
    description: string | null;
    event_date: string;
    location: string | null;
    max_participants: number | null;
    registered: boolean;
    registration_count: number;
  }[];
  documents: {
    id: number;
    title: string;
    file_type: string;
    created_at: string;
  }[];
  payment_reminders: {
    id: number;
    amount: number;
    due_date: string;
    status: string;
    notes: string | null;
  }[];
}

export const portalApi = {
  getData: async (token: string): Promise<MemberPortalData> => {
    const res = await api.get(`/portal/${token}`);
    return res.data;
  },
};
