import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';
import { Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SetupEmail() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const payload: any = { emailEnabled };
      if (emailEnabled) {
        if (!notificationEmails.trim()) {
          setError('Notification Emails are required when email notifications are enabled.');
          setIsLoading(false);
          return;
        }
        payload.notificationEmails = notificationEmails;
      }
      
      await api.post('/setup/save', payload);
      navigate('/setup/done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save email settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/setup/done');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-hero-glow pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6 }}
         className="w-full max-w-xl relative z-10"
      >
        <div className="flex justify-center items-center gap-3 mb-8 text-accent-cyan">
          <Mail className="w-10 h-10" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Setup Wizard</h1>
        </div>

        <div className="glass-card p-8 md:p-12 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div className="flex gap-2">
              <span className="text-accent-cyan font-bold">Step 2 of 3:</span>
              <span className="text-white font-medium">Configure Email Notifications</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
              <span className="w-2.5 h-2.5 rounded-full bg-bg-secondary" />
            </div>
          </div>

          <form onSubmit={handleNext} className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-bg-secondary/50 border border-border rounded-lg">
              <div>
                <h4 className="font-semibold text-white">Enable Review Emails</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Receive AI review reports automatically in your inbox.</p>
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
                    placeholder="e.g. inbox@acme.com, alerts@acme.com"
                    value={notificationEmails}
                    onChange={(e) => setNotificationEmails(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-accent-cyan placeholder:text-muted-foreground/30 text-sm"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-error bg-error/10 border border-error/20 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleSkip}
                className="flex-1 py-3 text-base"
                disabled={isLoading}
              >
                Skip for now
              </Button>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="flex-1 py-3 text-base flex justify-center items-center gap-2 shadow-glow-cyan"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Save and Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
