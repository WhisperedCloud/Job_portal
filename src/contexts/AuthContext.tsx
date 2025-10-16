import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  uploadResume: (file: File) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const initRef = useRef(false);

  const DEPLOYED_URL = "https://job-portal-a8zj.vercel.app";

  // --- BEGIN: Persist Auth session across tab switches using localStorage ---
  // Save session to localStorage on change
  useEffect(() => {
    const saveSessionToStorage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        localStorage.setItem("supabase.auth.session", JSON.stringify(session));
      } catch {}
    };
    saveSessionToStorage();
  }, [user]);

  // Restore session from localStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const localSession = localStorage.getItem("supabase.auth.session");
        if (localSession) {
          const parsed = JSON.parse(localSession);
          if (parsed && parsed.user) {
            await fetchUserData(parsed.user.id, parsed.user.email || '');
            setLoading(false);
            setInitializing(false);
            return;
          }
        }
      } catch {}
      // fallback to normal flow if not found
    })();
  }, []);
  // --- END: Persist Auth session across tab switches using localStorage ---

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );
        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (sessionError) {
          setUser(null);
          setLoading(false);
          setInitializing(false);
          if (location.pathname !== '/login' &&
              location.pathname !== '/register' &&
              location.pathname !== '/') {
            toast({
              title: "Session Expired",
              description: "Please log in again.",
              variant: "destructive"
            });
            navigate('/login', { replace: true });
          }
          return;
        }

        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          const publicRoutes = ['/login', '/register', '/'];
          if (!publicRoutes.includes(location.pathname)) {
            navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        setUser(null);
        if (location.pathname !== '/login' &&
            location.pathname !== '/register' &&
            location.pathname !== '/') {
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        toast({
          title: "Session Expired",
          description: "You have been logged out.",
        });
        navigate('/login', { replace: true });
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email || '');
        }
      } else if (event === 'USER_UPDATED') {
        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email || '');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string, email: string) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      // 1. Get role from user_roles
      const fetchRolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const { data: roleData, error: roleError } = await Promise.race([
        fetchRolePromise,
        timeoutPromise
      ]) as any;

      let role = 'candidate' as UserRole;
      if (roleData && roleData.role) {
        role = roleData.role as UserRole;
      }

      // 2. Get candidate_id from candidates table (if candidate)
      let candidate_id: string | undefined;
      if (role === 'candidate') {
        const { data: candidateRecord, error: candidateError } = await supabase
          .from('candidates')
          .select('id')
          .eq('user_id', userId)
          .single();
        candidate_id = candidateRecord?.id;
      }

      setUser({
        id: userId,
        email: email,
        role,
        candidate_id,
        created_at: new Date().toISOString()
      });

    } catch (error: any) {
      setUser({
        id: userId,
        email: email,
        role: 'candidate' as UserRole,
        candidate_id: undefined,
        created_at: new Date().toISOString()
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid login credentials",
          variant: "destructive"
        });
        setLoading(false);
        throw error;
      }

      if (data.user) {
        await fetchUserData(data.user.id, data.user.email || '');
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        navigate('/dashboard', { replace: true });
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, role: UserRole) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role
          },
          emailRedirectTo: `${DEPLOYED_URL}/login`
        }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
        throw error;
      }

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({
          title: "Registration Successful",
          description: "Account created successfully. You can now log in.",
        });
        navigate('/login', { replace: true });
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Logout error:', error);
      }

      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate('/login', { replace: true });
      setLoading(false);

    } catch (error) {
      setLoading(false);
      setUser(null);
      navigate('/login', { replace: true });
    }
  };

  const uploadResume = async (file: File) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const filePath = `${user.id}/${file.name}`;

    const { data, error } = await supabase.storage
      .from('Resumes')
      .upload(filePath, file, { upsert: true });

    if (error) {
      throw error;
    }

    return data;
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      uploadResume,
    }}>
      {children}
    </AuthContext.Provider>
  );
};