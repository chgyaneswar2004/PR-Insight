import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function RequireSetup() {
  const { user } = useAuthStore();

  if (user && !user.setupComplete) {
    return <Navigate to="/setup/llm" replace />;
  }

  return <Outlet />;
}
