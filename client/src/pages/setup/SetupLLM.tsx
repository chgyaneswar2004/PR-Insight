import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';
import { useSetupStore } from '../../store/setupStore';
import { Sparkles, BrainCircuit, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SetupLLM() {
  const navigate = useNavigate();
  const { 
    llmTier, 
    geminiApiKey: storeGeminiKey, 
    nvidiaApiKey: storeNvidiaKey, 
    paidProvider: storeProvider, 
    paidApiKey: storePaidKey, 
    paidModel: storeModel,
    setLlmTier, 
    setFreeFields, 
    setPaidFields,
    getAllCredentials
  } = useSetupStore();

  const [stage, setStage] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<'free' | 'paid' | null>(llmTier);

  // Free Tier State
  const [geminiApiKey, setGeminiApiKey] = useState(storeGeminiKey);
  const [nvidiaApiKey, setNvidiaApiKey] = useState(storeNvidiaKey);
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [nvidiaTestStatus, setNvidiaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Paid Tier State
  const [paidProvider, setPaidProvider] = useState<'openai' | 'gemini_pro' | 'deepseek'>(storeProvider || 'openai');
  const [paidApiKey, setPaidApiKey] = useState(storePaidKey);
  const [paidModel, setPaidModel] = useState(storeModel || 'gpt-4o');
  const [paidTestStatus, setPaidTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProviderChange = (prov: 'openai' | 'gemini_pro' | 'deepseek') => {
    setPaidProvider(prov);
    const defaults = {
      openai: 'gpt-4o',
      gemini_pro: 'gemini-1.5-pro',
      deepseek: 'deepseek-chat'
    };
    setPaidModel(defaults[prov]);
    setPaidTestStatus('idle');
  };

  const testFreeTier = async () => {
    if (!geminiApiKey.trim() || !nvidiaApiKey.trim()) {
      setError('Both Gemini and NVIDIA API keys are required to test.');
      return;
    }
    
    setError('');
    setGeminiTestStatus('testing');
    setNvidiaTestStatus('testing');

    try {
      const res: any = await api.post('/setup/test/llm', {
        tier: 'free',
        geminiApiKey,
        nvidiaApiKey
      });

      if (res?.success) {
        setGeminiTestStatus('success');
        setNvidiaTestStatus('success');
      } else {
        if (res?.field === 'gemini') {
          setGeminiTestStatus('error');
          setNvidiaTestStatus('idle');
          setError(res.error || 'Gemini authentication failed.');
        } else if (res?.field === 'nvidia') {
          setGeminiTestStatus('success');
          setNvidiaTestStatus('error');
          setError(res.error || 'NVIDIA NIM authentication failed.');
        } else {
          setGeminiTestStatus('error');
          setNvidiaTestStatus('error');
          setError(res?.error || 'Validation failed.');
        }
      }
    } catch (err: any) {
      setGeminiTestStatus('error');
      setNvidiaTestStatus('error');
      setError(err.response?.data?.error || 'Validation request failed.');
    }
  };

  const testPaidTier = async () => {
    if (!paidApiKey.trim()) {
      setError('API key is required to test.');
      return;
    }

    setError('');
    setPaidTestStatus('testing');

    try {
      const res: any = await api.post('/setup/test/llm', {
        tier: 'paid',
        paidProvider,
        paidApiKey
      });

      if (res?.success) {
        setPaidTestStatus('success');
      } else {
        setPaidTestStatus('error');
        setError(res?.error || 'Authentication failed for the selected provider.');
      }
    } catch (err: any) {
      setPaidTestStatus('error');
      setError(err.response?.data?.error || 'Validation request failed.');
    }
  };

  const handleNextStage = () => {
    if (!selectedTier) {
      setError('Please select an AI tier.');
      return;
    }
    setError('');
    setStage(2);
  };

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;

    if (selectedTier === 'free') {
      if (geminiTestStatus !== 'success' || nvidiaTestStatus !== 'success') {
        setError('Please test and verify both API keys before continuing.');
        return;
      }
      setFreeFields(geminiApiKey, nvidiaApiKey);
    } else {
      if (paidTestStatus !== 'success') {
        setError('Please test and verify your API key before continuing.');
        return;
      }
      setPaidFields(paidProvider, paidApiKey, paidModel);
    }

    setLlmTier(selectedTier);
    setIsLoading(true);
    setError('');

    try {
      // Fetch credentials object formatted in correct shape from Zustand store
      const credentials = getAllCredentials();
      await api.post('/setup/save', credentials);
      
      // Go to Step 2: Email Configuration
      navigate('/setup/email');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save LLM configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-hero-glow pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="flex justify-center items-center gap-3 mb-8 text-accent-cyan">
          <BrainCircuit className="w-10 h-10 animate-pulse-glow rounded-full" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Setup Wizard</h1>
        </div>

        <div className="glass-card p-8 md:p-12 relative overflow-hidden">
          {/* Stepper Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div className="flex gap-2 text-sm">
              <span className="text-accent-cyan font-bold">Step 1 of 3:</span>
              <span className="text-white font-medium">AI Model Configuration</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-bg-secondary" />
              <span className="w-2.5 h-2.5 rounded-full bg-bg-secondary" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stage === 1 ? (
              /* Stage 1: Tier Selection */
              <motion.div
                key="stage1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left mb-2">
                  <h2 className="text-lg font-bold text-white">How would you like to use AI?</h2>
                  <p className="text-xs text-muted-foreground mt-1">Select an AI tier to power your PR reviews.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Free Tier Card */}
                  <div
                    onClick={() => { setSelectedTier('free'); setError(''); }}
                    className={`cursor-pointer border p-5 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                      selectedTier === 'free'
                        ? 'border-accent-cyan bg-accent-cyan/10 shadow-glow-cyan'
                        : 'border-border bg-bg-secondary/40 hover:border-border-light hover:bg-bg-secondary/80'
                    }`}
                  >
                    <div className="absolute top-0 right-0 px-3 py-1 bg-accent-cyan/20 border-b border-l border-accent-cyan/30 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider text-accent-cyan">
                      Cost: $0
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg border ${
                        selectedTier === 'free' ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan' : 'bg-bg-card border-border text-muted-foreground group-hover:text-white'
                      }`}>
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Free Tier</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Uses Google Gemini for summarizations and NVIDIA NIM for deep code analysis. Requires 2 free keys. Slight delay due to rate limits.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Paid Tier Card */}
                  <div
                    onClick={() => { setSelectedTier('paid'); setError(''); }}
                    className={`cursor-pointer border p-5 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                      selectedTier === 'paid'
                        ? 'border-accent-purple bg-accent-purple/10 shadow-glow-purple'
                        : 'border-border bg-bg-secondary/40 hover:border-border-light hover:bg-bg-secondary/80'
                    }`}
                  >
                    <div className="absolute top-0 right-0 px-3 py-1 bg-accent-purple/20 border-b border-l border-accent-purple/30 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider text-accent-purple">
                      Cost: usage-based
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg border ${
                        selectedTier === 'paid' ? 'bg-accent-purple/20 border-accent-purple/40 text-accent-purple' : 'bg-bg-card border-border text-muted-foreground group-hover:text-white'
                      }`}>
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Paid Tier</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Uses a single provider (OpenAI, Gemini Pro, or DeepSeek) for everything. Requires 1 API key. No throttling, faster reviews.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-error bg-error/10 border border-error/20 px-3 py-2 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleNextStage}
                  variant="gradient"
                  size="lg"
                  className="w-full py-3 text-sm flex justify-center items-center gap-2 shadow-glow-cyan"
                >
                  Configure selected tier
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : selectedTier === 'free' ? (
              /* Stage 2A: Free Tier Fields */
              <motion.div
                key="stage2a"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">Free Tier Setup</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Please provide your API keys to proceed.</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan rounded-full font-semibold">
                    Free
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Gemini Key */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        Google Gemini API Key <span className="text-error">*</span>
                      </label>
                      <a 
                        href="https://aistudio.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-accent-cyan hover:underline flex items-center gap-0.5"
                      >
                        Get free key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="flex gap-2 relative">
                      <input
                        type="password"
                        placeholder="Enter your Google Gemini API key"
                        value={geminiApiKey}
                        onChange={(e) => { setGeminiApiKey(e.target.value); setGeminiTestStatus('idle'); }}
                        className="flex-1 bg-bg-secondary border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan text-sm placeholder:text-muted-foreground/30"
                      />
                      <div className="flex items-center shrink-0">
                        {geminiTestStatus === 'success' && (
                          <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {geminiTestStatus === 'error' && (
                          <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                        {geminiTestStatus === 'testing' && (
                          <span className="h-9 px-3 bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan rounded-md text-xs font-semibold flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" /> Verifying...
                          </span>
                        )}
                        {geminiTestStatus === 'idle' && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={testFreeTier}
                            className="h-9 text-xs"
                          >
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 block">Used for file summaries and pull request overviews.</span>
                  </div>

                  {/* NVIDIA NIM Key */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        NVIDIA NIM API Key <span className="text-error">*</span>
                      </label>
                      <a 
                        href="https://build.nvidia.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-accent-cyan hover:underline flex items-center gap-0.5"
                      >
                        Get free key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="flex gap-2 relative">
                      <input
                        type="password"
                        placeholder="Enter your NVIDIA NIM API key"
                        value={nvidiaApiKey}
                        onChange={(e) => { setNvidiaApiKey(e.target.value); setNvidiaTestStatus('idle'); }}
                        className="flex-1 bg-bg-secondary border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan text-sm placeholder:text-muted-foreground/30"
                      />
                      <div className="flex items-center shrink-0">
                        {nvidiaTestStatus === 'success' && (
                          <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {nvidiaTestStatus === 'error' && (
                          <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                        {nvidiaTestStatus === 'testing' && (
                          <span className="h-9 px-3 bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan rounded-md text-xs font-semibold flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" /> Verifying...
                          </span>
                        )}
                        {nvidiaTestStatus === 'idle' && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={testFreeTier}
                            className="h-9 text-xs"
                          >
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 block">Used for deep AI analysis and quality reviews.</span>
                  </div>
                </div>

                {error && (
                  <div className="text-error bg-error/10 border border-error/20 px-3 py-2 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStage(1); setError(''); }}
                    className="flex-1 py-3 text-sm flex justify-center items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    variant="gradient"
                    onClick={handleSaveAndContinue}
                    disabled={isLoading || geminiTestStatus !== 'success' || nvidiaTestStatus !== 'success'}
                    className="flex-1 py-3 text-sm flex justify-center items-center gap-1.5 shadow-glow-cyan"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Save & Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Stage 2B: Paid Tier Fields */
              <motion.div
                key="stage2b"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">Paid Tier Setup</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Please provide your API key and choose a model.</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple rounded-full font-semibold">
                    Paid
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Select Provider */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Select Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['openai', 'gemini_pro', 'deepseek'] as const).map((prov) => (
                        <div
                          key={prov}
                          onClick={() => handleProviderChange(prov)}
                          className={`cursor-pointer border py-2.5 rounded-lg text-center text-xs font-bold transition-all duration-200 capitalize ${
                            paidProvider === prov
                              ? 'border-accent-purple bg-accent-purple/10 text-white shadow-glow-purple'
                              : 'border-border bg-bg-secondary/40 text-muted-foreground hover:text-white hover:border-border-light'
                          }`}
                        >
                          {prov === 'gemini_pro' ? 'Gemini Pro' : prov}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground">
                        API Key <span className="text-error">*</span>
                      </label>
                      <a
                        href={
                          paidProvider === 'openai' 
                            ? 'https://platform.openai.com/api-keys' 
                            : paidProvider === 'gemini_pro'
                            ? 'https://aistudio.google.com'
                            : 'https://platform.deepseek.com/api_keys'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-accent-purple hover:underline flex items-center gap-0.5"
                      >
                        Get key <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="flex gap-2 relative">
                      <input
                        type="password"
                        placeholder={`Enter your ${paidProvider === 'gemini_pro' ? 'Gemini' : paidProvider} API key`}
                        value={paidApiKey}
                        onChange={(e) => { setPaidApiKey(e.target.value); setPaidTestStatus('idle'); }}
                        className="flex-1 bg-bg-secondary border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-purple text-sm placeholder:text-muted-foreground/30"
                      />
                      <div className="flex items-center shrink-0">
                        {paidTestStatus === 'success' && (
                          <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {paidTestStatus === 'error' && (
                          <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                        {paidTestStatus === 'testing' && (
                          <span className="h-9 px-3 bg-accent-purple/15 border border-accent-purple/30 text-accent-purple rounded-md text-xs font-semibold flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" /> Verifying...
                          </span>
                        )}
                        {paidTestStatus === 'idle' && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={testPaidTier}
                            className="h-9 text-xs"
                          >
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Code Review Model */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      Code Review Model <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gpt-4o, gemini-1.5-pro, deepseek-chat"
                      value={paidModel}
                      onChange={(e) => setPaidModel(e.target.value)}
                      className="w-full bg-bg-secondary border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-purple text-sm placeholder:text-muted-foreground/30"
                    />
                    <span className="text-[10px] text-muted-foreground/60 block">
                      Common models: <strong>gpt-4o</strong>, <strong>gpt-4o-mini</strong> (OpenAI) | <strong>gemini-1.5-pro</strong>, <strong>gemini-2.5-flash</strong> (Gemini) | <strong>deepseek-chat</strong> (DeepSeek).
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="text-error bg-error/10 border border-error/20 px-3 py-2 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStage(1); setError(''); }}
                    className="flex-1 py-3 text-sm flex justify-center items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    variant="gradient"
                    onClick={handleSaveAndContinue}
                    disabled={isLoading || paidTestStatus !== 'success'}
                    className="flex-1 py-3 text-sm flex justify-center items-center gap-1.5 shadow-glow-cyan"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Save & Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// Simple custom component to support the non-standard lucide icon (Zap is standard, but keeping code clean)
function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
