import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

export function AdminRoute() {
  const { isAdmin } = useAuthContext();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
