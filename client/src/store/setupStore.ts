import { create } from 'zustand';

interface SetupStore {
  llmTier: 'free' | 'paid' | null;
  geminiApiKey: string;
  nvidiaApiKey: string;
  paidProvider: 'openai' | 'gemini_pro' | 'deepseek' | null;
  paidApiKey: string;
  paidModel: string;
  
  setLlmTier: (tier: 'free' | 'paid' | null) => void;
  setFreeFields: (geminiApiKey: string, nvidiaApiKey: string) => void;
  setPaidFields: (paidProvider: 'openai' | 'gemini_pro' | 'deepseek' | null, paidApiKey: string, paidModel: string) => void;
  getAllCredentials: () => Record<string, string>;
  reset: () => void;
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  llmTier: null,
  geminiApiKey: '',
  nvidiaApiKey: '',
  paidProvider: null,
  paidApiKey: '',
  paidModel: '',

  setLlmTier: (tier) => set({ llmTier: tier }),
  setFreeFields: (geminiApiKey, nvidiaApiKey) => set({ geminiApiKey, nvidiaApiKey }),
  setPaidFields: (paidProvider, paidApiKey, paidModel) => set({ paidProvider, paidApiKey, paidModel }),
  
  reset: () => set({
    llmTier: null,
    geminiApiKey: '',
    nvidiaApiKey: '',
    paidProvider: null,
    paidApiKey: '',
    paidModel: ''
  }),

  getAllCredentials(): Record<string, string> {
    const state = get();
    if (state.llmTier === 'free') {
      return {
        LLM_TIER: 'free',
        GEMINI_API_KEY: state.geminiApiKey,
        NVIDIA_API_KEY: state.nvidiaApiKey,
        CODE_SUMMARY_MODEL: 'gemini-3.1-flash-lite',
        PR_SUMMARY_MODEL: 'gemini-3.1-flash-lite',
        CODE_REVIEW_MODEL: 'meta/llama-3.1-70b-instruct',
        OPENAI_API_BASE: 'https://integrate.api.nvidia.com/v1',
        THROTTLE_ENABLED: 'true'
      } as Record<string, string>;
    }

    if (state.llmTier === 'paid') {
      const baseMap: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        gemini_pro: 'https://generativelanguage.googleapis.com/v1beta',
        deepseek: 'https://api.deepseek.com/v1'
      };
      return {
        LLM_TIER: 'paid',
        OPENAI_API_KEY: state.paidApiKey,
        OPENAI_API_BASE: baseMap[state.paidProvider!],
        CODE_SUMMARY_MODEL: state.paidModel,
        PR_SUMMARY_MODEL: state.paidModel,
        CODE_REVIEW_MODEL: state.paidModel,
        THROTTLE_ENABLED: 'false'
      } as Record<string, string>;
    }

    return {};
  }
}));
