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

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );
        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error: sessionError } =
  await Promise.race([sessionPromise, timeoutPromise]) as any;
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
          await fetchUserData(session.user.id, session.user.email || '', session.user.user_metadata);
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
      console.log('🔄 [AUTH] Event:', event, session?.user?.id);
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
        await fetchUserData(session.user.id, session.user.email || '', session.user.user_metadata);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/login', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchingRef = useRef<string | null>(null);

  const fetchUserData = async (userId: string, email: string, userMetadata?: any) => {
    // 🛡️ LOCK: Prevent overlapping concurrent enrichment calls for the same user
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    try {
      console.log('Enriching user session from database...', { userId });

      // 1. Define a timeout promise (3 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB Timeout')), 3000)
      );

      // Wrapper to race any promise against our timeout
      const withTimeout = async <T,>(p: Promise<T>): Promise<T> => {
        return Promise.race([p, timeoutPromise]) as Promise<T>;
      };

      // 2. Start with metadata role as a reliable baseline
      let role = (userMetadata?.role || 'candidate') as UserRole;
      let candidate_id: string | undefined;

      // 3. Try to enrich with database data
      try {
        await withTimeout((async () => {
          console.log('Fetching enrichment data for user:', userId);
          // Parallelize Role and Profile fetches
          const [roleResponse, candidateResponse] = await Promise.all([
            supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
            supabase.from('candidates').select('id').eq('user_id', userId).maybeSingle()
          ]);

          if (roleResponse.error) {
            console.error('Role Fetch Error:', roleResponse.error);
          }
          if (candidateResponse.error) {
            console.error('Candidate Fetch Error:', candidateResponse.error);
          }

          if (!roleResponse.error && roleResponse.data?.role) {
            role = roleResponse.data.role as UserRole;
          }

          if (candidateResponse.data?.id) {
            candidate_id = candidateResponse.data.id;
          }
          console.log('Enrichment complete:', { role, candidate_id });
        })());
      } catch (err: any) {
        if (err.message === 'DB Timeout') {
          console.warn('Database enrichment timed out after 10s. Continuing with metadata role.');
        } else {
          console.warn('Enrichment failed:', err.message);
        }
      }

      // 4. Update state (guaranteed to complete because of timeout)
      setUser({
        id: userId,
        email: email,
        role,
        candidate_id,
        created_at: new Date().toISOString()
      });

    } catch (error: any) {
    } finally {
      fetchingRef.current = null;
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
        await fetchUserData(data.user.id, data.user.email || '', data.user.user_metadata);
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
          emailRedirectTo: window.location.origin
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
      // Attempt sign out; ignore AuthSessionMissingError (session already gone)
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== 'Auth session missing!') {
        console.error('Logout error:', error);
      }
    } catch (_) {
      // Swallow all errors — we still want to clear state and redirect
    } finally {
      setUser(null);
      setLoading(false);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
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