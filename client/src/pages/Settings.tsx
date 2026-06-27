import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { 
  Save, 
  ShieldCheck, 
  GitMerge, 
  AlertTriangle, 
  Sparkles, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Settings() {
  const currentUser = useAuthStore(state => state.user);
  const isAdmin = currentUser?.role === 'admin';

  // Active Tab: 'general' | 'admin'
  const [activeTab, setActiveTab] = useState<'general' | 'admin'>('general');

  // General Settings State
  const [llmTier, setLlmTier] = useState<'free' | 'paid'>('free');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [nvidiaApiKey, setNvidiaApiKey] = useState('');
  const [paidProvider, setPaidProvider] = useState<'openai' | 'gemini_pro' | 'deepseek'>('openai');
  const [paidApiKey, setPaidApiKey] = useState('');
  const [paidModel, setPaidModel] = useState('gpt-4o');

  // SMTP General State
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState('');

  const [loadedConfig, setLoadedConfig] = useState<any>(null);

  // General Validation/Saving State
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [nvidiaTestStatus, setNvidiaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [paidTestStatus, setPaidTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');

  // Admin Settings State (visible only to admins)
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch Current User's credentials
  const fetchCredentials = async () => {
    try {
      const creds: any = await api.get('/setup/credentials');
      if (creds) {
        setLoadedConfig(creds);
        // Set LLM Tier
        if (creds.LLM_TIER) {
          setLlmTier(creds.LLM_TIER);
        }

        // Set Free Tier fields
        if (creds.GEMINI_API_KEY) {
          setGeminiApiKey(creds.GEMINI_API_KEY);
          setGeminiTestStatus('success');
        }
        if (creds.NVIDIA_API_KEY) {
          setNvidiaApiKey(creds.NVIDIA_API_KEY);
          setNvidiaTestStatus('success');
        }

        // Set Paid Tier fields
        // We figure out the provider from the base URL or tier
        if (creds.OPENAI_API_BASE) {
          if (creds.OPENAI_API_BASE.includes('api.openai.com')) {
            setPaidProvider('openai');
          } else if (creds.OPENAI_API_BASE.includes('googleapis.com')) {
            setPaidProvider('gemini_pro');
          } else if (creds.OPENAI_API_BASE.includes('deepseek.com')) {
            setPaidProvider('deepseek');
          }
        }
        if (creds.OPENAI_API_KEY) {
          setPaidApiKey(creds.OPENAI_API_KEY);
          setPaidTestStatus('success');
        }
        if (creds.CODE_REVIEW_MODEL && creds.LLM_TIER === 'paid') {
          setPaidModel(creds.CODE_REVIEW_MODEL);
        }

        // Set SMTP Settings
        setEmailEnabled(creds.EMAIL_ENABLED === 'true');
        if (creds.NOTIFICATION_EMAILS) setNotificationEmails(creds.NOTIFICATION_EMAILS);
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
    }
  };

  // Fetch admin settings & users (only if admin)
  const fetchAdminData = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const [settingsData, usersData] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/users')
      ]);
      setAdminSettings(settingsData);
      setUsersList((usersData as any).users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const isFormDirty = () => {
    if (!loadedConfig) return false;
    
    // Check SMTP fields
    const emailEnabledDb = loadedConfig.EMAIL_ENABLED === 'true';
    if (emailEnabled !== emailEnabledDb) return true;
    
    if (emailEnabled) {
      if (notificationEmails !== (loadedConfig.NOTIFICATION_EMAILS || '')) return true;
    }

    // Check LLM Tier
    if (llmTier !== (loadedConfig.LLM_TIER || 'free')) return true;
    
    if (llmTier === 'free') {
      if (geminiApiKey !== (loadedConfig.GEMINI_API_KEY || '')) return true;
      if (nvidiaApiKey !== (loadedConfig.NVIDIA_API_KEY || '')) return true;
    } else {
      let loadedProv = 'openai';
      if (loadedConfig.OPENAI_API_BASE) {
        if (loadedConfig.OPENAI_API_BASE.includes('api.openai.com')) loadedProv = 'openai';
        else if (loadedConfig.OPENAI_API_BASE.includes('googleapis.com')) loadedProv = 'gemini_pro';
        else if (loadedConfig.OPENAI_API_BASE.includes('deepseek.com')) loadedProv = 'deepseek';
      }
      if (paidProvider !== loadedProv) return true;
      if (paidApiKey !== (loadedConfig.OPENAI_API_KEY || '')) return true;
      if (paidModel !== (loadedConfig.CODE_REVIEW_MODEL || 'gpt-4o')) return true;
    }
    
    return false;
  };

  useEffect(() => {
    fetchCredentials();
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  // General Settings Saving
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralError('');
    setGeneralSuccess('');

    try {
      // Build correct credentials payload matching Zustand setupStore's shape
      const payload: any = {
        LLM_TIER: llmTier
      };

      if (llmTier === 'free') {
        payload.GEMINI_API_KEY = geminiApiKey;
        payload.NVIDIA_API_KEY = nvidiaApiKey;
        payload.CODE_SUMMARY_MODEL = 'gemini-3.1-flash-lite';
        payload.PR_SUMMARY_MODEL = 'gemini-3.1-flash-lite';
        payload.CODE_REVIEW_MODEL = 'meta/llama-3.1-70b-instruct';
        payload.OPENAI_API_BASE = 'https://integrate.api.nvidia.com/v1';
        payload.THROTTLE_ENABLED = 'true';
      } else {
        const baseMap: Record<string, string> = {
          openai: 'https://api.openai.com/v1',
          gemini_pro: 'https://generativelanguage.googleapis.com/v1beta',
          deepseek: 'https://api.deepseek.com/v1'
        };
        payload.OPENAI_API_KEY = paidApiKey;
        payload.OPENAI_API_BASE = baseMap[paidProvider];
        payload.CODE_SUMMARY_MODEL = paidModel;
        payload.PR_SUMMARY_MODEL = paidModel;
        payload.CODE_REVIEW_MODEL = paidModel;
        payload.THROTTLE_ENABLED = 'false';
      }

      // Add SMTP settings
      payload.emailEnabled = emailEnabled;
      if (emailEnabled) {
        payload.notificationEmails = notificationEmails;
      }

      await api.post('/setup/save', payload);

      // Reconstruct what loadedConfig should look like now
      const newLoadedConfig: any = {
        LLM_TIER: llmTier,
        EMAIL_ENABLED: emailEnabled ? 'true' : 'false'
      };
      if (llmTier === 'free') {
        newLoadedConfig.GEMINI_API_KEY = geminiApiKey;
        newLoadedConfig.NVIDIA_API_KEY = nvidiaApiKey;
      } else {
        const baseMap: Record<string, string> = {
          openai: 'https://api.openai.com/v1',
          gemini_pro: 'https://generativelanguage.googleapis.com/v1beta',
          deepseek: 'https://api.deepseek.com/v1'
        };
        newLoadedConfig.OPENAI_API_KEY = paidApiKey;
        newLoadedConfig.OPENAI_API_BASE = baseMap[paidProvider];
        newLoadedConfig.CODE_REVIEW_MODEL = paidModel;
      }
      if (emailEnabled) {
        newLoadedConfig.NOTIFICATION_EMAILS = notificationEmails;
        // preserve existing SMTP settings if loaded
        if (loadedConfig?.SMTP_SERVER) newLoadedConfig.SMTP_SERVER = loadedConfig.SMTP_SERVER;
        if (loadedConfig?.SMTP_PORT) newLoadedConfig.SMTP_PORT = loadedConfig.SMTP_PORT;
        if (loadedConfig?.SMTP_USERNAME) newLoadedConfig.SMTP_USERNAME = loadedConfig.SMTP_USERNAME;
        if (loadedConfig?.SMTP_PASSWORD) newLoadedConfig.SMTP_PASSWORD = loadedConfig.SMTP_PASSWORD;
      }
      setLoadedConfig(newLoadedConfig);

      setGeneralSuccess('General settings saved successfully.');
      setTimeout(() => setGeneralSuccess(''), 4000);
    } catch (err: any) {
      setGeneralError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // LLM verification methods
  const testFreeTier = async () => {
    if (!geminiApiKey.trim() || !nvidiaApiKey.trim()) {
      setGeneralError('Both Gemini and NVIDIA API keys are required to test.');
      return;
    }
    setGeneralError('');
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
          setGeneralError(res.error || 'Gemini authentication failed.');
        } else if (res?.field === 'nvidia') {
          setGeminiTestStatus('success');
          setNvidiaTestStatus('error');
          setGeneralError(res.error || 'NVIDIA NIM authentication failed.');
        } else {
          setGeminiTestStatus('error');
          setNvidiaTestStatus('error');
          setGeneralError(res?.error || 'Validation failed.');
        }
      }
    } catch (err: any) {
      setGeminiTestStatus('error');
      setNvidiaTestStatus('error');
      setGeneralError(err.response?.data?.error || 'Validation request failed.');
    }
  };

  const testPaidTier = async () => {
    if (!paidApiKey.trim()) {
      setGeneralError('API key is required to test.');
      return;
    }
    setGeneralError('');
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
        setGeneralError(res?.error || 'Authentication failed for the selected provider.');
      }
    } catch (err: any) {
      setPaidTestStatus('error');
      setGeneralError(err.response?.data?.error || 'Validation request failed.');
    }
  };

  // Admin Panel Saving
  const handleSaveAdmin = async () => {
    setIsSavingAdmin(true);
    try {
      await api.put('/admin/settings', adminSettings);
      setTimeout(() => setIsSavingAdmin(false), 500);
    } catch (err) {
      console.error(err);
      setIsSavingAdmin(false);
    }
  };

  const handleResetSetup = async (userId: string) => {
    if (!confirm('Are you sure you want to reset setup for this user? They will be forced to complete the setup wizard again.')) return;
    try {
      await api.post(`/admin/users/${userId}/reset`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke access? This will permanently delete the user and all of their repositories, PRs, and review results.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateRule = (key: string, value: any) => {
    setAdminSettings({
      ...adminSettings,
      reviewRules: { ...adminSettings.reviewRules, [key]: value }
    });
  };

  const updateThreshold = (key: string, value: number) => {
    setAdminSettings({
      ...adminSettings,
      severityThresholds: { ...adminSettings.severityThresholds, [key]: value }
    });
  };

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

  return (
    <Layout>
      <div className="space-y-6 pb-8 max-w-4xl">
        {/* Title Block */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isAdmin ? 'Admin Panel' : 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? 'Configure global AI review rules, manage platform access, and update credentials.' 
              : 'Configure your personal AI configurations and notification services.'}
          </p>
        </div>

        {/* Admin Tabs */}
        {isAdmin && (
          <div className="flex border-b border-border gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === 'general'
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'border-accent-purple text-accent-purple'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              Platform Settings (Admin)
            </button>
          </div>
        )}

        {/* Notifications & Error Area */}
        {generalError && (
          <div className="text-error bg-error/10 border border-error/20 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}
        {generalSuccess && (
          <div className="text-success bg-success/10 border border-success/20 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{generalSuccess}</span>
          </div>
        )}

        {/* Tab 1: General Settings */}
        {(activeTab === 'general' || !isAdmin) && (
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            {/* LLM Configuration Card */}
            <Card className="border-border bg-bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-cyan" />
                  AI Tier Configuration
                </CardTitle>
                <CardDescription>Select and configure your personal AI models and keys.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Select Tier */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => { setLlmTier('free'); setGeneralError(''); }}
                    className={`cursor-pointer border p-4 rounded-xl transition-all duration-200 ${
                      llmTier === 'free'
                        ? 'border-accent-cyan bg-accent-cyan/10 shadow-glow-cyan'
                        : 'border-border bg-bg-secondary/40 hover:border-border-light hover:bg-bg-secondary/80'
                    }`}
                  >
                    <h4 className="font-bold text-white text-sm">Free Tier</h4>
                    <p className="text-xs text-muted-foreground mt-1">Gemini (summaries) + NVIDIA NIM (reviews).</p>
                  </div>

                  <div
                    onClick={() => { setLlmTier('paid'); setGeneralError(''); }}
                    className={`cursor-pointer border p-4 rounded-xl transition-all duration-200 ${
                      llmTier === 'paid'
                        ? 'border-accent-purple bg-accent-purple/10 shadow-glow-purple'
                        : 'border-border bg-bg-secondary/40 hover:border-border-light hover:bg-bg-secondary/80'
                    }`}
                  >
                    <h4 className="font-bold text-white text-sm">Paid Tier</h4>
                    <p className="text-xs text-muted-foreground mt-1">Single Provider for everything (OpenAI, Gemini Pro, DeepSeek).</p>
                  </div>
                </div>

                {/* Conditional Fields */}
                {llmTier === 'free' ? (
                  <div className="space-y-4 pt-2">
                    {/* Gemini Key */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground">Google Gemini API Key</label>
                        <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-cyan flex items-center gap-0.5 hover:underline">
                          Get key <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          value={geminiApiKey}
                          onChange={(e) => { setGeminiApiKey(e.target.value); setGeminiTestStatus('idle'); }}
                          className="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-cyan"
                        />
                        <div className="flex items-center shrink-0">
                          {geminiTestStatus === 'success' && <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
                          {geminiTestStatus === 'error' && <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                          {geminiTestStatus === 'testing' && <span className="h-9 px-3 bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan rounded-md text-xs font-semibold flex items-center gap-1"><div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" /> Testing</span>}
                          {geminiTestStatus === 'idle' && <Button type="button" variant="outline" onClick={testFreeTier} className="h-9 text-xs">Test</Button>}
                        </div>
                      </div>
                    </div>

                    {/* NVIDIA NIM Key */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground">NVIDIA NIM API Key</label>
                        <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-cyan flex items-center gap-0.5 hover:underline">
                          Get key <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="nvapi-..."
                          value={nvidiaApiKey}
                          onChange={(e) => { setNvidiaApiKey(e.target.value); setNvidiaTestStatus('idle'); }}
                          className="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-cyan"
                        />
                        <div className="flex items-center shrink-0">
                          {nvidiaTestStatus === 'success' && <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
                          {nvidiaTestStatus === 'error' && <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                          {nvidiaTestStatus === 'testing' && <span className="h-9 px-3 bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan rounded-md text-xs font-semibold flex items-center gap-1"><div className="w-3 h-3 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" /> Testing</span>}
                          {nvidiaTestStatus === 'idle' && <Button type="button" variant="outline" onClick={testFreeTier} className="h-9 text-xs">Test</Button>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Provider */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Select Provider</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['openai', 'gemini_pro', 'deepseek'] as const).map((prov) => (
                          <div
                            key={prov}
                            onClick={() => handleProviderChange(prov)}
                            className={`cursor-pointer border py-2 rounded-lg text-center text-xs font-bold transition-all duration-200 capitalize ${
                              paidProvider === prov
                                ? 'border-accent-purple bg-accent-purple/10 text-white shadow-glow-purple'
                                : 'border-border bg-bg-secondary/40 text-muted-foreground hover:text-white'
                            }`}
                          >
                            {prov === 'gemini_pro' ? 'Gemini Pro' : prov}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={paidApiKey}
                          onChange={(e) => { setPaidApiKey(e.target.value); setPaidTestStatus('idle'); }}
                          className="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple"
                        />
                        <div className="flex items-center shrink-0">
                          {paidTestStatus === 'success' && <span className="h-9 px-3 bg-success/15 border border-success/30 text-success rounded-md text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
                          {paidTestStatus === 'error' && <span className="h-9 px-3 bg-error/15 border border-error/30 text-error rounded-md text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                          {paidTestStatus === 'testing' && <span className="h-9 px-3 bg-accent-purple/15 border border-accent-purple/30 text-accent-purple rounded-md text-xs font-semibold flex items-center gap-1"><div className="w-3 h-3 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" /> Testing</span>}
                          {paidTestStatus === 'idle' && <Button type="button" variant="outline" onClick={testPaidTier} className="h-9 text-xs">Test</Button>}
                        </div>
                      </div>
                    </div>

                    {/* Model */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Model Name</label>
                      <input
                        type="text"
                        value={paidModel}
                        onChange={(e) => setPaidModel(e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Notifications Configuration */}
            <Card className="border-border bg-bg-card/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-accent-purple" />
                  Email Notifications (SMTP)
                </CardTitle>
                <CardDescription>Receive AI-generated review reports directly in your inbox.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-bg-elevated/50 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-white">Enable Review Emails</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle automated PR email reporting.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailEnabled} 
                      onChange={(e) => setEmailEnabled(e.target.checked)} 
                    />
                    <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan"></div>
                  </label>
                </div>

                {emailEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Recipient Emails (comma separated)</label>
                      <input
                        type="text"
                        placeholder="alerts@acme.com, reviewer@acme.com"
                        value={notificationEmails}
                        onChange={(e) => setNotificationEmails(e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-cyan"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingGeneral || !isFormDirty()} variant="gradient" className="flex items-center gap-2 shadow-glow-cyan">
                {isSavingGeneral ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Admin settings (Visible only to admin and activeTab === 'admin') */}
        {isAdmin && activeTab === 'admin' && adminSettings && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={handleSaveAdmin} disabled={isSavingAdmin} className="flex items-center gap-2">
                {isSavingAdmin ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Platform Changes
              </Button>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GitMerge className="w-5 h-5 text-accent-cyan" />
                  Review & Auto-Merge Rules
                </CardTitle>
                <CardDescription>Define how the AI agent handles pull request reviews and merging.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-bg-elevated/50 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium text-white">Enable Auto-Merge</h4>
                    <p className="text-sm text-muted-foreground mt-1">Automatically merge pull requests if they pass all quality and security gates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={adminSettings.reviewRules.autoMerge} onChange={(e) => updateRule('autoMerge', e.target.checked)} />
                    <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-bg-elevated/50 rounded-lg border border-border">
                  <div>
                    <h4 className="font-medium text-white">Block on Critical Vulnerabilities</h4>
                    <p className="text-sm text-muted-foreground mt-1">Prevent merging and auto-request changes if critical security issues are found.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={adminSettings.reviewRules.blockOnCritical} onChange={(e) => updateRule('blockOnCritical', e.target.checked)} />
                    <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
                  </label>
                </div>

                <div className="p-4 bg-bg-elevated/50 rounded-lg border border-border">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="font-medium text-white">Minimum Quality Score</h4>
                      <p className="text-sm text-muted-foreground mt-1">Pull requests scoring below this threshold will require human review.</p>
                    </div>
                    <span className="text-2xl font-bold text-accent-cyan">{adminSettings.reviewRules.minQualityScore}/100</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={adminSettings.reviewRules.minQualityScore} 
                    onChange={(e) => updateRule('minQualityScore', parseInt(e.target.value))}
                    className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-accent-purple" />
                  Score Thresholds
                </CardTitle>
                <CardDescription>Adjust the score deductions for different severity levels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-error flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Critical Penalty</label>
                    <input type="number" value={adminSettings.severityThresholds.critical} onChange={(e) => updateThreshold('critical', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-warning flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> High Penalty</label>
                    <input type="number" value={adminSettings.severityThresholds.high} onChange={(e) => updateThreshold('high', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-accent-cyan">Medium Penalty</label>
                    <input type="number" value={adminSettings.severityThresholds.medium} onChange={(e) => updateThreshold('medium', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Low Penalty</label>
                    <input type="number" value={adminSettings.severityThresholds.low} onChange={(e) => updateThreshold('low', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">User Management</CardTitle>
                <CardDescription>View and manage all registered users, reset setup wizards, promote/demote roles, or revoke access.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-medium text-xs uppercase tracking-wider">
                          <th className="pb-3 pl-4">User</th>
                          <th className="pb-3">Role</th>
                          <th className="pb-3">Setup Status</th>
                          <th className="pb-3">Tier</th>
                          <th className="pb-3">Joined</th>
                          <th className="pb-3 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {usersList.map((user) => (
                          <tr key={user.id} className="hover:bg-bg-elevated/20 transition-colors">
                            <td className="py-4 pl-4 flex items-center gap-3">
                              <img src={user.avatar} alt={user.login} className="w-8 h-8 rounded-full border border-border" />
                              <div>
                                <p className="font-semibold text-white">@{user.login}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-bg-secondary text-muted-foreground'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-4">
                              {user.setupComplete ? (
                                <span className="text-success flex items-center gap-1 text-xs">✅ Complete</span>
                              ) : (
                                <span className="text-warning flex items-center gap-1 text-xs">❌ Incomplete</span>
                              )}
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                user.llmTier === 'free' 
                                  ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20' 
                                  : user.llmTier === 'paid' 
                                  ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/20' 
                                  : 'bg-bg-secondary text-muted-foreground'
                              }`}>
                                {user.llmTier || '—'}
                              </span>
                            </td>
                            <td className="py-4 text-muted-foreground text-xs">
                              {new Date(user.joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-4 pr-4 text-right space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleResetSetup(user.id)}
                                className="text-xs px-2.5 py-1 h-auto"
                              >
                                Reset Setup
                              </Button>
                              
                              {user.id !== currentUser?.id && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleChangeRole(user.id, user.role)}
                                    className="text-xs px-2.5 py-1 h-auto"
                                  >
                                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleRevokeAccess(user.id)}
                                    className="text-xs px-2.5 py-1 h-auto hover:bg-error/10 hover:text-error hover:border-error/30"
                                  >
                                    Revoke
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
