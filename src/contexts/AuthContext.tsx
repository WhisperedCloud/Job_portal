import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  uploadResume: (file: File) => Promise<any>; // 👈 added for resume uploads
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for demo user first
    const checkDemoUser = () => {
      const storedDemoUser = localStorage.getItem('demoUser');
      if (storedDemoUser) {
        const demoUser = JSON.parse(storedDemoUser) as User;
        setUser(demoUser);
        return true;
      }
      return false;
    };

    // If demo user exists, use it
    if (checkDemoUser()) {
      setLoading(false);
      return;
    }

    // Otherwise, check for Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email || '');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserData(session.user.id, session.user.email || '');
      } else {
        // Only clear user if there's no demo user
        if (!checkDemoUser()) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string, email: string) => {
    try {
      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData) {
        const userData: User = {
          id: userId,
          email: email,
          role: roleData.role as UserRole,
          created_at: new Date().toISOString()
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: "Invalid Login Credentials",
          variant: "destructive"
        });
        throw error;
      }

      if (data.user) {
        await fetchUserData(data.user.id, data.user.email || '');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    try {
      console.log('Starting registration process...', { email, role });
      
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

      console.log('Supabase auth signup response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify the data was created by the trigger
        const { data: roleCheck } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id);
        
        console.log('Role check after registration:', roleCheck);
        
        toast({
          title: "Registration Successful",
          description: "Account created successfully. You can now log in.",
        });
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear user state
      setUser(null);
      
      // Remove demo user from localStorage
      localStorage.removeItem('demoUser');
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      localStorage.removeItem('demoUser');
      navigate('/login', { replace: true });
    }
  };

  // 👇 NEW: Resume upload helper
  const uploadResume = async (file: File) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Path format: Resumes/<userId>/<filename>
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
