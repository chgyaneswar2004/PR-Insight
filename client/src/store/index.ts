import { create } from 'zustand';
import type { Repo, PullRequest, Review, Notification, AgentLog, ChatMessage } from '../types';
import { api } from '../lib/api';

interface AppState {
  // Data
  repos: Repo[];
  prs: PullRequest[];
  notifications: Notification[];
  activeReview: Review | null;
  agentLogs: AgentLog[];
  chatMessages: ChatMessage[];
  
  // Loading states
  isLoadingRepos: boolean;
  isLoadingPRs: boolean;
  isAgentRunning: boolean;
  isChatTyping: boolean;
  
  // Actions
  fetchRepos: () => Promise<void>;
  fetchPRs: (repoId?: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addAgentLog: (log: AgentLog) => void;
  setActiveReview: (review: Review | null) => void;
  setAgentRunning: (status: boolean) => void;
  clearAgentLogs: () => void;
  sendChatMessage: (prId: string, content: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  repos: [],
  prs: [],
  notifications: [],
  activeReview: null,
  agentLogs: [],
  chatMessages: [],
  isLoadingRepos: false,
  isLoadingPRs: false,
  isAgentRunning: false,
  isChatTyping: false,

  fetchRepos: async () => {
    set({ isLoadingRepos: true });
    try {
      const data: any = await api.get('/repos');
      set({ repos: data.repos });
    } catch (error) {
      console.error('Failed to fetch repos', error);
    } finally {
      set({ isLoadingRepos: false });
    }
  },

  fetchPRs: async (repoId) => {
    set({ isLoadingPRs: true });
    try {
      const url = repoId ? `/repos/${repoId}/prs` : '/prs';
      const data: any = await api.get(url);
      set({ prs: data.prs });
    } catch (error) {
      console.error('Failed to fetch PRs', error);
    } finally {
      set({ isLoadingPRs: false });
    }
  },

  fetchNotifications: async () => {
    try {
      const data: any = await api.get('/notifications');
      set({ notifications: data.notifications });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  },

  markNotificationRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  addAgentLog: (log) => {
    set((state) => ({ agentLogs: [...state.agentLogs, log] }));
  },

  setActiveReview: (review) => {
    set({ activeReview: review });
  },

  setAgentRunning: (status) => {
    set({ isAgentRunning: status });
  },

  clearAgentLogs: () => {
    set({ agentLogs: [] });
  },

  sendChatMessage: async (prId: string, content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({ 
      chatMessages: [...state.chatMessages, userMsg],
      isChatTyping: true
    }));

    try {
      const history = get().chatMessages;
      const response: any = await api.post(`/prs/${prId}/chat`, { 
        message: content,
        history
      });
      
      set((state) => ({
        chatMessages: [...state.chatMessages, response]
      }));
    } catch (error) {
      console.error('Failed to send chat message', error);
      // Optional: Add error message to chat
    } finally {
      set({ isChatTyping: false });
    }
  }
}));
