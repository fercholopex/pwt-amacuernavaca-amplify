import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
// Define la estructura del contexto de autenticación
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  iniciarSesionConEmail: (email: string, password: string) => Promise<void>;
  iniciarSesionConGoogle: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}
// Crea el contexto con un valor predeterminado indefinido
const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Componente Provider que envuelve tu aplicación y hace que el objeto auth esté disponible para cualquier componente hijo que llame a useAuth()
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // Verificar si el usuario es admin
      if (user) {
        setIsAdmin(user.email?.endsWith('@admin.ama.mx') || false);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Iniciar sesión con email y contraseña
  const iniciarSesionConEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      console.error('Error al iniciar sesión:', err);
    } finally {
      setLoading(false);
    }
  };
  // Iniciar sesión con Google
  const iniciarSesionConGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
      console.error('Error al iniciar sesión con Google:', err);
    } finally {
      setLoading(false);
    }
  };
  // Cerrar sesión
  const cerrarSesion = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesión');
      console.error('Error al cerrar sesión:', err);
    } finally {
      setLoading(false);
    }
  };
  // El valor que se proporcionará a cualquier consumidor de este contexto
  const value = {
    user,
    loading,
    error,
    isAdmin,
    iniciarSesionConEmail,
    iniciarSesionConGoogle,
    cerrarSesion
  };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
// Hook personalizado que simplifica el uso del contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};