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

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initRef.current) return;
    initRef.current = true;

    console.log('🔄 Initializing Auth...');

    const initializeAuth = async () => {
      try {
        // Check for Supabase session with 3s timeout
        console.log('🔍 Checking Supabase session...');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setUser(null);
          setLoading(false);
          setInitializing(false);
          
          // Redirect to login if session expired and on protected route
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
          console.log('✅ Found active session for user:', session.user.id);
          await fetchUserData(session.user.id, session.user.email || '');
        } else {
          console.log('ℹ️ No active session found');
          setUser(null);
          
          // Redirect to login if no session and trying to access protected route
          const publicRoutes = ['/login', '/register', '/'];
          if (!publicRoutes.includes(location.pathname)) {
            navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setUser(null);
        
        // Redirect to login on error if on protected route
        if (location.pathname !== '/login' && 
            location.pathname !== '/register' && 
            location.pathname !== '/') {
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
        setInitializing(false);
        console.log('✅ Auth initialization complete');
      }
    };

    initializeAuth();

    // Listen for auth changes with better handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in:', session.user.id);
        await fetchUserData(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        toast({
          title: "Session Expired",
          description: "You have been logged out.",
        });
        navigate('/login', { replace: true });
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully');
        if (session?.user) {
          await fetchUserData(session.user.id, session.user.email || '');
        }
      } else if (event === 'USER_UPDATED') {
        console.log('🔄 User updated');
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
      console.log('📥 Fetching user data for:', userId);

      // Get user role with 2s timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 2000)
      );

      const fetchPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const { data: roleData, error: roleError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (roleError) {
        console.error('❌ Error fetching role:', roleError);
        
        // Check for authentication/authorization errors
        if (roleError.message?.includes('JWT') || 
            roleError.message?.includes('token') ||
            roleError.code === 'PGRST301') {
          console.error('🔒 Auth token invalid or expired');
          toast({
            title: "Session Expired",
            description: "Please log in again.",
            variant: "destructive"
          });
          setUser(null);
          navigate('/login', { replace: true });
          return;
        }
        
        // If role doesn't exist or timeout, set user with default role immediately
        if (roleError.code === 'PGRST116' || roleError.message === 'Request timeout') {
          console.log('⚠️ No role found or timeout, using default role');
          const userData: User = {
            id: userId,
            email: email,
            role: 'candidate' as UserRole,
            created_at: new Date().toISOString()
          };
          setUser(userData);
          return;
        }
        
        // For other errors, still set user
        const userData: User = {
          id: userId,
          email: email,
          role: 'candidate' as UserRole,
          created_at: new Date().toISOString()
        };
        setUser(userData);
        return;
      }

      if (roleData) {
        console.log('✅ User role:', roleData.role);
        const userData: User = {
          id: userId,
          email: email,
          role: roleData.role as UserRole,
          created_at: new Date().toISOString()
        };
        setUser(userData);
      }
    } catch (error: any) {
      console.error('❌ Error fetching user data:', error);
      
      // Check for JWT or token errors
      if (error.message?.includes('JWT') || 
          error.message?.includes('token') ||
          error.message?.includes('expired')) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        setUser(null);
        navigate('/login', { replace: true });
        return;
      }
      
      // On any other error, set basic user data immediately
      const userData: User = {
        id: userId,
        email: email,
        role: 'candidate' as UserRole,
        created_at: new Date().toISOString()
      };
      setUser(userData);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Login error:', error);
        toast({
          title: "Login Failed",
          description: error.message || "Invalid login credentials",
          variant: "destructive"
        });
        setLoading(false);
        throw error;
      }

      if (data.user) {
        console.log('✅ Login successful');
        
        // Fetch user data
        await fetchUserData(data.user.id, data.user.email || '');
        
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });

        console.log('🚀 Navigating to dashboard');
        
        // Navigate immediately
        navigate('/dashboard', { replace: true });
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, role: UserRole) => {
    try {
      setLoading(true);
      console.log('📝 Starting registration process...', { email, role });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      console.log('📤 Supabase auth signup response:', { data, error });

      if (error) {
        console.error('❌ Supabase auth error:', error);
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
        throw error;
      }

      if (data.user) {
        console.log('✅ User created successfully:', data.user.id);
        
        // Reduced wait time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast({
          title: "Registration Successful",
          description: "Account created successfully. You can now log in.",
        });

        // Navigate immediately
        navigate('/login', { replace: true });
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Registration failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log('👋 Logging out...');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
      }
      
      // Clear user state
      setUser(null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });

      console.log('🚀 Navigating to login...');
      
      // Navigate immediately
      navigate('/login', { replace: true });
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Logout error:', error);
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
      console.error("Resume upload failed:", error.message);
      throw error;
    }

    return data;
  };

  // Show minimal loading spinner during initial load
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