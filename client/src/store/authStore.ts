import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  setupComplete: boolean;
  githubAppUrl?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  fetchUser: async () => {
    set({ loading: true });
    try {
      const baseURL = api.defaults.baseURL || 'http://localhost:3001/api';
      const authBaseURL = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
      
      const response = await api.get(`${authBaseURL}/auth/me`);
      set({ user: response as unknown as User, loading: false, initialized: true });
    } catch (error) {
      console.error('Failed to fetch user', error);
      set({ user: null, loading: false, initialized: true });
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      const baseURL = api.defaults.baseURL || 'http://localhost:3001/api';
      const authBaseURL = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
      await api.post(`${authBaseURL}/auth/logout`);
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Failed to logout', error);
      set({ loading: false });
    }
  },
  setUser: (user) => set({ user })
}));
