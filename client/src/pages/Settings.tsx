import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { Save, ShieldCheck, GitMerge, AlertTriangle } from 'lucide-react';


export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(setSettings).catch(console.error);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/admin/settings', settings);
      setTimeout(() => setIsSaving(false), 500); // Simulate network delay for UX
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const updateRule = (key: string, value: any) => {
    setSettings({
      ...settings,
      reviewRules: { ...settings.reviewRules, [key]: value }
    });
  };

  const updateThreshold = (key: string, value: number) => {
    setSettings({
      ...settings,
      severityThresholds: { ...settings.severityThresholds, [key]: value }
    });
  };

  if (!settings) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Settings</h1>
            <p className="text-muted-foreground mt-1">Configure global AI review rules and system thresholds.</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
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
                  <input type="checkbox" className="sr-only peer" checked={settings.reviewRules.autoMerge} onChange={(e) => updateRule('autoMerge', e.target.checked)} />
                  <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-elevated/50 rounded-lg border border-border">
                <div>
                  <h4 className="font-medium text-white">Block on Critical Vulnerabilities</h4>
                  <p className="text-sm text-muted-foreground mt-1">Prevent merging and auto-request changes if critical security issues are found.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.reviewRules.blockOnCritical} onChange={(e) => updateRule('blockOnCritical', e.target.checked)} />
                  <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
                </label>
              </div>

              <div className="p-4 bg-bg-elevated/50 rounded-lg border border-border">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h4 className="font-medium text-white">Minimum Quality Score</h4>
                    <p className="text-sm text-muted-foreground mt-1">Pull requests scoring below this threshold will require human review.</p>
                  </div>
                  <span className="text-2xl font-bold text-accent-cyan">{settings.reviewRules.minQualityScore}/100</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={settings.reviewRules.minQualityScore} 
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
                  <input type="number" value={settings.severityThresholds.critical} onChange={(e) => updateThreshold('critical', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-warning flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> High Penalty</label>
                  <input type="number" value={settings.severityThresholds.high} onChange={(e) => updateThreshold('high', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-accent-cyan">Medium Penalty</label>
                  <input type="number" value={settings.severityThresholds.medium} onChange={(e) => updateThreshold('medium', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Low Penalty</label>
                  <input type="number" value={settings.severityThresholds.low} onChange={(e) => updateThreshold('low', parseInt(e.target.value))} className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-cyan" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
