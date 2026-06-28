import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { socketService } from './lib/socket';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIReview from './pages/AIReview';
import Repositories from './pages/Repositories';
import PullRequests from './pages/PullRequests';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

import { RequireAuth } from './components/auth/RequireAuth';
import { RequireSetup } from './components/auth/RequireSetup';
import SetupLLM from './pages/setup/SetupLLM';
import SetupEmail from './pages/setup/SetupEmail';
import SetupDone from './pages/setup/SetupDone';

import { useAppStore } from './store';

function App() {
  const { fetchPRs, fetchRepos, fetchStats, fetchAnalytics } = useAppStore();

  useEffect(() => {
    socketService.connect();

    const handleStarted = () => {
      console.log('[Socket] Review started, reloading PR list...');
      fetchPRs();
    };

    const handleCompleted = () => {
      console.log('[Socket] Review completed, reloading stats and PRs...');
      fetchPRs();
      fetchRepos();
      fetchStats();
      fetchAnalytics();
    };

    socketService.on('agent:started', handleStarted);
    socketService.on('agent:completed', handleCompleted);

    return () => {
      socketService.off('agent:started', handleStarted);
      socketService.off('agent:completed', handleCompleted);
      socketService.disconnect();
    };
  }, [fetchPRs, fetchRepos, fetchStats, fetchAnalytics]);

  return (
    <Router>
      <div className="min-h-screen bg-bg-primary text-white font-sans">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<RequireAuth />}>
            <Route path="/setup/llm" element={<SetupLLM />} />
            <Route path="/setup/email" element={<SetupEmail />} />
            <Route path="/setup/done" element={<SetupDone />} />

            <Route element={<RequireSetup />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/repos" element={<Repositories />} />
              <Route path="/prs" element={<PullRequests />} />
              <Route path="/review/:id" element={<AIReview />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
