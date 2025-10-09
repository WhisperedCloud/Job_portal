import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Mail, User, Building, Shield, MoreHorizontal, Loader2 } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  joinDate: string;
}

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers: UserData[] = [];

      // Fetch all users from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) {
        console.error('Error fetching user_roles:', rolesError);
        throw rolesError;
      }

      console.log('Fetched user_roles:', userRoles);

      if (userRoles) {
        // For each user, fetch their details based on role
        for (const userRole of userRoles) {
          let name = 'Unknown User';
          let email = 'N/A';

          // Fetch from candidates table if role is candidate
          if (userRole.role === 'candidate') {
            const { data: candidate, error: candidateError } = await supabase
              .from('candidates')
              .select('name, user_id')
              .eq('user_id', userRole.user_id)
              .single();

            if (!candidateError && candidate) {
              name = candidate.name;
            }
          }

          // Fetch from recruiters table if role is recruiter
          if (userRole.role === 'recruiter') {
            const { data: recruiter, error: recruiterError } = await supabase
              .from('recruiters')
              .select('company_name, user_id')
              .eq('user_id', userRole.user_id)
              .single();

            if (!recruiterError && recruiter) {
              name = recruiter.company_name;
            }
          }

          // If role is admin, set default name
          if (userRole.role === 'admin') {
            name = 'Admin User';
          }

          // Try to get email from auth metadata or users table
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userRole.user_id);
          
          if (!authError && authUser?.user) {
            email = authUser.user.email || 'N/A';
          } else {
            // Fallback: Try getting from users table if it exists
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email')
              .eq('id', userRole.user_id)
              .single();

            if (!userError && userData) {
              email = userData.email || 'N/A';
            }
          }

          allUsers.push({
            id: userRole.user_id,
            name: name,
            email: email,
            role: userRole.role,
            status: 'active',
            lastActive: userRole.updated_at 
              ? new Date(userRole.updated_at).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'short' 
                })
              : 'N/A',
            joinDate: new Date(userRole.created_at).toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })
          });
        }
      }

      console.log('Processed users:', allUsers);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'candidate':
        return 'bg-blue-100 text-blue-800';
      case 'recruiter':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
                <p className="text-muted-foreground mt-2">
                  View and manage all platform users
                </p>
              </div>
              <Button onClick={() => toast.info('Invite feature coming soon!')}>
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Candidates</p>
                      <p className="text-2xl font-bold">{users.filter(u => u.role === 'candidate').length}</p>
                    </div>
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recruiters</p>
                      <p className="text-2xl font-bold">{users.filter(u => u.role === 'recruiter').length}</p>
                    </div>
                    <Building className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Admins</p>
                      <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                    </div>
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="candidate">Candidates</SelectItem>
                      <SelectItem value="recruiter">Recruiters</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Full members and their details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {loading ? 'Loading users...' : 'No users found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role)}
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(user.status)}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.lastActive}</TableCell>
                          <TableCell>{user.joinDate}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toast.info('User management actions coming soon!')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Users;