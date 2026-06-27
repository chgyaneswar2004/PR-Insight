import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, CheckCircle2, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SetupDone() {
  const { fetchUser } = useAuthStore();
  const navigate = useNavigate();

  const handleFinish = async () => {
    // Refresh user state to fetch setup_complete: true and user profile
    await fetchUser();
    // Redirect to home dashboard
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-hero-glow pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="flex justify-center items-center gap-3 mb-8 text-accent-cyan">
          <ShieldCheck className="w-10 h-10" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Setup Complete</h1>
        </div>

        <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center text-success animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">You're all set!</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
            Your GitHub integration is active, your LLM model is configured, and email notifications are set up. PR Insight is ready to automate your code reviews.
          </p>

          <div className="space-y-3 bg-bg-secondary/40 border border-border p-5 rounded-lg text-left max-w-md mx-auto mb-8 text-sm">
            <div className="flex items-center gap-2.5 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>GitHub OAuth token configured</span>
            </div>
            <div className="flex items-center gap-2.5 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>AI Engine initialized</span>
            </div>
            <div className="flex items-center gap-2.5 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>Isolation sandbox verified</span>
            </div>
          </div>

          <Button
            onClick={handleFinish}
            variant="gradient"
            size="lg"
            className="w-full max-w-sm py-3.5 text-base flex justify-center items-center gap-2 shadow-glow-cyan"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
