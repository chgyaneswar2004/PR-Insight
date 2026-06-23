import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { socketService } from './lib/socket';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIReview from './pages/AIReview';
import Repositories from './pages/Repositories';
import PullRequests from './pages/PullRequests';

// Placeholder Pages
const Analytics = () => <Layout><div className="p-8 text-white">Analytics Page</div></Layout>;
const Settings = () => <Layout><div className="p-8 text-white">Settings Page</div></Layout>;

function App() {
  useEffect(() => {
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-bg-primary text-white font-sans">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/repos" element={<Repositories />} />
          <Route path="/prs" element={<PullRequests />} />
          <Route path="/review/:id" element={<AIReview />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
