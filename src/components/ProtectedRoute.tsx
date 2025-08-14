import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (!user) {
      router.push('/');
      } else if (adminOnly && !user.email?.endsWith('@admin.ama.mx')) {
      router.push('/servicios'); // Redirigir a servicios si no es admin
      } else if (adminOnly && user.email?.endsWith('@admin.ama.mx')) {
        // Si es admin, no hacer nada, ya que el usuario tiene acceso
      }
    }
  }, [user, loading, router, adminOnly]);
  if (loading) {
    return <div>Cargando...</div>;
  }
  if (!user || (adminOnly && !user.email?.endsWith('@admin.ama.mx'))) {
    return null;
  }
  return <>{children}</>;
};
export default ProtectedRoute;