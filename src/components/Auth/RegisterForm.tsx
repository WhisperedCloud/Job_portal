import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UserRole } from '../../types';
import { Briefcase, Shield, User, Building } from 'lucide-react';
import { useToast } from '../ui/use-toast';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('candidate');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admin verification code (in production, this should be in environment variables)
  const ADMIN_SECRET_CODE = 'JOBPORTAL_ADMIN_2025';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    // Verify admin code if admin role is selected
    if (role === 'admin' && adminCode !== ADMIN_SECRET_CODE) {
      toast({
        title: "Invalid Admin Code",
        description: "The admin verification code you entered is incorrect",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, role);
      // Navigation to login is handled in the register function
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (roleType: UserRole) => {
    switch (roleType) {
      case 'candidate':
        return <User className="h-4 w-4" />;
      case 'recruiter':
        return <Building className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleDescription = (roleType: UserRole) => {
    switch (roleType) {
      case 'candidate':
        return 'Search and apply for jobs';
      case 'recruiter':
        return 'Post jobs and hire candidates';
      case 'admin':
        return 'Manage the entire platform';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join JobPortal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Create your account to access the job portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Job Seeker</span>
                          <span className="text-xs text-muted-foreground">Search and apply for jobs</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="recruiter">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Recruiter/Company</span>
                          <span className="text-xs text-muted-foreground">Post jobs and hire candidates</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Administrator</span>
                          <span className="text-xs text-muted-foreground">Manage the entire platform</span>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Show role description */}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {getRoleIcon(role)}
                  <span>{getRoleDescription(role)}</span>
                </div>
              </div>

              {/* Admin Verification Code Field */}
              {role === 'admin' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Admin Verification Required</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You need a special admin code to create an administrator account
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adminCode" className="text-yellow-900">Admin Verification Code</Label>
                    <Input
                      id="adminCode"
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      required
                      placeholder="Enter admin verification code"
                      className="mt-1 border-yellow-300 focus:border-yellow-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <button 
                  onClick={() => navigate('/login')}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in
                </button>
              </span>
            </div>

            {/* Admin Code Info (for demo purposes - remove in production) */}
            {role === 'admin' && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Demo Admin Code:</strong> JOBPORTAL_ADMIN_2024
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (In production, remove this hint and use environment variables)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterForm;