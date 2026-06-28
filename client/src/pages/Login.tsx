import { Button } from '../components/ui/button';
import { GitBranch, Sparkles, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

export default function Login() {

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col md:flex-row">
      {/* Left side: Branding & Marketing */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-center p-12 lg:p-24 border-r border-border">
        <div className="absolute top-0 left-0 w-full h-full bg-hero-glow pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-xl"
        >
          <div className="flex items-center gap-3 mb-8 text-accent-cyan">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-accent-cyan/5 p-1 flex items-center justify-center">
              <img src="/logo.png" alt="PR Insight" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">PR Insight AI</h1>
          </div>
          
          <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Code Review, <br />
            <span className="text-gradient">Supercharged</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-12">
            Automate code reviews, detect security vulnerabilities, and merge pull requests faster with our intelligent AI agent. Let the machine do the heavy lifting while your team focuses on what matters.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI-Powered Analysis</h3>
                <p className="text-sm text-muted-foreground">Claude 3.5 Sonnet analyzes your code for bugs and smells.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center text-error">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Security First</h3>
                <p className="text-sm text-muted-foreground">Catch vulnerabilities before they hit production.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-success">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Auto-Merge Capability</h3>
                <p className="text-sm text-muted-foreground">Automatically merge PRs that pass quality and security gates.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full md:w-[480px] lg:w-[600px] flex items-center justify-center p-8 bg-bg-secondary relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md glass-card p-8 md:p-12 relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-purple/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-cyan/30 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
            </div>
            
            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full flex items-center justify-center gap-3 py-6 text-base shadow-glow-purple"
              onClick={() => {
                const baseURL = api.defaults.baseURL || 'http://localhost:3001/api';
                const rootURL = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
                window.location.href = `${rootURL}/auth/github`;
              }}
            >
              <GitBranch className="w-5 h-5" />
              Continue with GitHub
            </Button>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="w-full h-px bg-border"></span>
              <span className="px-2 whitespace-nowrap">For demonstration purposes</span>
              <span className="w-full h-px bg-border"></span>
            </div>
            
            <p className="text-center text-xs text-muted-foreground mt-8">
              By clicking continue, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
