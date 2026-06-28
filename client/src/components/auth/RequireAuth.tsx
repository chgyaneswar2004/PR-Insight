import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export function RequireAuth() {
  const { user, loading, initialized, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      fetchUser();
    }
  }, [initialized, fetchUser]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
