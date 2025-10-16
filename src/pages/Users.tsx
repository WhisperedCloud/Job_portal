import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  Search, 
  User, 
  Building, 
  Shield, 
  MoreHorizontal, 
  Loader2,
  RefreshCw,
  Ban,
  CheckCircle,
  Trash2,
  Calendar,
  Users as UsersIcon,
  TrendingUp,
  Activity
} from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserBan {
  id: string;
  user_id: string;
  banned_by?: string;
  banned_at: string;
  banned_until: string;
  reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserData {
  id: string;
  name: string;
  role: string;
  status: string;
  joinDate: string;
  email: string; // <-- Added email property
  email_confirmed_at?: string;
  banned_until?: string;
  isBanned?: boolean;
}

interface UserAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
  condition: boolean;
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [banDuration, setBanDuration] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      checkCurrentUserRole();
      fetchUsers();
    }
  }, [currentUser]);

  const checkCurrentUserRole = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();
      
      if (!error && data) {
        setCurrentUserRole(data.role);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers: UserData[] = [];

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      if (userRoles) {
        for (const userRole of userRoles) {
          let name = 'Unknown User';
          let email = userRole.email || 'N/A'; 
          let email_confirmed_at = undefined;
          let banned_until = undefined;
          let isBanned = false;

          if (userRole.role === 'candidate') {
            const { data: candidate } = await supabase
              .from('candidates')
              .select('name')
              .eq('user_id', userRole.user_id)
              .maybeSingle();

            if (candidate) {
              name = candidate.name;
            }
          }

          if (userRole.role === 'recruiter') {
            const { data: recruiter } = await supabase
              .from('recruiters')
              .select('company_name, name')
              .eq('user_id', userRole.user_id)
              .maybeSingle();

            if (recruiter) {
              name = recruiter.name || recruiter.company_name;
            }
          }

          if (userRole.role === 'admin') {
            name = 'Admin User';
          }

          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(userRole.user_id);
            
            if (authUser?.user) {
              email_confirmed_at = authUser.user.email_confirmed_at;
            }
          } catch (authError) {
            // Continue
          }

          try {
            const { data: banData } = await (supabase
              .from('user_bans' as any)
              .select('*')
              .eq('user_id', userRole.user_id)
              .eq('is_active', true)
              .maybeSingle()) as { data: UserBan | null; error: any };

            if (banData && banData.banned_until) {
              banned_until = banData.banned_until;
              isBanned = new Date(banData.banned_until) > new Date();
            }
          } catch (banError) {
            // No ban
          }

          let status = 'active';
          if (isBanned) {
            status = 'banned';
          }

          allUsers.push({
            id: userRole.user_id,
            name: name,
            role: userRole.role,
            status: status,
            email: email, // <-- Assign email here
            joinDate: new Date(userRole.created_at).toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }),
            email_confirmed_at,
            banned_until,
            isBanned
          });
        }
      }

      setUsers(allUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banDuration) {
      toast.error('Please select a ban duration');
      return;
    }
  
    try {
      setActionLoading(true);
  
      const response = await supabase.functions.invoke('admin-user-actions', {
        body: {
          action: 'ban_user',
          userId: selectedUser.id,
          data: {
            duration: banDuration,
            reason: `Banned for ${banDuration}`,
            adminId: currentUser?.id, 
          },
        },
      });
  
      if (response.error) {
        const errorMessage = response.error.message || JSON.stringify(response.error);
        throw new Error(`Function error: ${errorMessage}`);
      }

      const data = response.data;

      if (!data || data.success === false) {
        const errorMsg = data?.error || data?.message || 'Unknown error from function';
        throw new Error(errorMsg);
      }

      const durationText = banDuration === 'permanent' ? 'permanently' : `for ${banDuration}`;
      toast.success(`🚫 ${selectedUser.name} has been banned ${durationText}`);
      
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === selectedUser.id 
            ? { 
                ...u, 
                status: 'banned', 
                isBanned: true, 
                banned_until: data.data?.banned_until 
              } 
            : u
        )
      );

      setIsBanDialogOpen(false);
      setSelectedUser(null);
      setBanDuration('');
      
      setTimeout(() => fetchUsers(), 500);
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error(error.message || 'Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string, userName: string) => {
    try {
      setActionLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-user-actions', {
        body: {
          action: 'unban_user',
          userId: userId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to unban user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to unban user');
      }

      toast.success(`✅ Ban revoked for ${userName}`);
      
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId 
            ? { ...u, status: 'active', isBanned: false, banned_until: undefined } 
            : u
        )
      );

      setTimeout(() => fetchUsers(), 500);
    } catch (error: any) {
      console.error('Error revoking ban:', error);
      toast.error(error.message || 'Failed to revoke ban');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-user-actions', {
        body: {
          action: 'delete_user',
          userId: selectedUser.id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete user');
      }

      toast.success(`🗑️ ${selectedUser.name} has been deleted`);
      
      setUsers(prevUsers => prevUsers.filter(u => u.id !== selectedUser.id));

      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      
      setTimeout(() => fetchUsers(), 500);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'candidate': return <User className="h-4 w-4" />;
      case 'recruiter': return <Building className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'candidate': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'recruiter': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'admin': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'banned': return 'bg-red-100 text-red-800 animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'banned': return <Ban className="h-3 w-3 mr-1" />;
      default: return <Activity className="h-3 w-3 mr-1" />;
    }
  };

  const isUserBanned = (user: UserData) => user.isBanned === true;
  const canPerformAction = (targetUser: UserData) => {
    if (!currentUser || targetUser.id === currentUser.id) return false;
    return currentUserRole === 'admin';
  };

  const getUserActions = (user: UserData): UserAction[] => {
    const actions: UserAction[] = [];
    const isBanned = isUserBanned(user);
    const isAdmin = user.role === 'admin';
    const isSelf = user.id === currentUser?.id;

    if (isBanned && !isSelf && currentUserRole === 'admin') {
      actions.push({
        id: 'revoke-ban',
        label: 'Revoke Ban',
        icon: <CheckCircle className="h-4 w-4 mr-2" />,
        onClick: () => handleUnbanUser(user.id, user.name),
        variant: 'success',
        className: 'text-green-600 focus:text-green-700 focus:bg-green-50',
        condition: true,
      });
    }

    if (!isBanned && !isSelf && !isAdmin && currentUserRole === 'admin') {
      actions.push({
        id: 'ban',
        label: 'Ban User',
        icon: <Ban className="h-4 w-4 mr-2" />,
        onClick: () => {
          setSelectedUser(user);
          setIsBanDialogOpen(true);
        },
        variant: 'warning',
        className: 'text-orange-600 focus:text-orange-700 focus:bg-orange-50',
        condition: true,
      });
    }

    if (!isAdmin && !isSelf && currentUserRole === 'admin') {
      actions.push({
        id: 'delete',
        label: 'Delete User',
        icon: <Trash2 className="h-4 w-4 mr-2" />,
        onClick: () => {
          setSelectedUser(user);
          setIsDeleteDialogOpen(true);
        },
        variant: 'destructive',
        className: 'text-red-600 focus:text-red-700 focus:bg-red-50',
        condition: true,
      });
    }

    return actions.filter(action => action.condition);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase())
      || user.email.toLowerCase().includes(searchTerm.toLowerCase()); // <-- Enable search by email
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    candidates: users.filter(u => u.role === 'candidate').length,
    recruiters: users.filter(u => u.role === 'recruiter').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.status === 'active').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Loading users...</p>
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
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <UsersIcon className="h-8 w-8" />
                  User Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  Managing {stats.total} users • {stats.active} active{stats.banned > 0 && ` • ${stats.banned} banned`}
                </p>
                {currentUserRole && (
                  <Badge className="mt-2 bg-purple-100 text-purple-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Your Role: {currentUserRole}
                  </Badge>
                )}
              </div>
              <Button onClick={() => fetchUsers()} disabled={loading || actionLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-3xl font-bold">{stats.total}</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stats.active} active
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-lg">
                      <UsersIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Candidates</p>
                      <p className="text-3xl font-bold">{stats.candidates}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.total > 0 ? ((stats.candidates / stats.total) * 100).toFixed(1) : 0}% of total
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recruiters</p>
                      <p className="text-3xl font-bold">{stats.recruiters}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.total > 0 ? ((stats.recruiters / stats.total) * 100).toFixed(1) : 0}% of total
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Admins</p>
                      <p className="text-3xl font-bold">{stats.admins}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.banned > 0 ? <span className="text-red-600">{stats.banned} banned</span> : 'All active'}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
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
                      <SelectItem value="all">All Roles ({stats.total})</SelectItem>
                      <SelectItem value="candidate">Candidates ({stats.candidates})</SelectItem>
                      <SelectItem value="recruiter">Recruiters ({stats.recruiters})</SelectItem>
                      <SelectItem value="admin">Admins ({stats.admins})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status ({stats.total})</SelectItem>
                      <SelectItem value="active">Active ({stats.active})</SelectItem>
                      <SelectItem value="banned">Banned ({stats.banned})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Users ({filteredUsers.length})</span>
                  {filteredUsers.length !== stats.total && (
                    <Badge variant="secondary">
                      Filtered from {stats.total}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Manage user access and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <UsersIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold text-muted-foreground">No users found</p>
                    <Button variant="outline" className="mt-4" onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    }}>
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead> {/* <-- Added Email column */}
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Join Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => {
                          const userActions = getUserActions(user);
                          const isSelf = user.id === currentUser?.id;
                          
                          return (
                            <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${getRoleBadgeColor(user.role)}`}>
                                    {getRoleIcon(user.role)}
                                  </div>
                                  <div>
                                    <span className="font-medium">{user.name}</span>
                                    {isSelf && (
                                      <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell> {/* <-- Show email here */}
                              <TableCell>
                                <Badge className={getRoleBadgeColor(user.role)}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusBadgeColor(user.status)}>
                                  {getStatusIcon(user.status)}
                                  {user.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {user.joinDate}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {isSelf ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    <User className="h-3 w-3 mr-1" />
                                    You
                                  </Badge>
                                ) : !canPerformAction(user) ? (
                                  <Badge variant="outline">Admin Only</Badge>
                                ) : userActions.length === 0 ? (
                                  <Badge variant="outline">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Protected
                                  </Badge>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" disabled={actionLoading}>
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuLabel>Actions ({userActions.length})</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {userActions.map((action) => (
                                        <DropdownMenuItem
                                          key={action.id}
                                          onClick={action.onClick}
                                          className={action.className || ''}
                                          data-variant={action.variant}
                                          disabled={actionLoading}
                                        >
                                          {action.icon}
                                          {action.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                    )}
                                    </TableCell>
                                    </TableRow>
                                    );
                                    })}
                                    </TableBody>
                                    </Table>
                                    </div>
                                    )}
                                    </CardContent>
                                    </Card>
                                    </div>
                                    </main>
                                    </div>
                                    {/* Ban User Dialog */}
                                    <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Ban User</DialogTitle>
                                          <DialogDescription>
                                            Ban <span className="font-bold">{selectedUser?.name}</span> from accessing the portal.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <Label htmlFor="banDuration">Ban Duration</Label>
                                          <Select value={banDuration} onValueChange={setBanDuration}>
                                            <SelectTrigger id="banDuration">
                                              <SelectValue placeholder="Select ban duration" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1 day">1 day</SelectItem>
                                              <SelectItem value="7 days">7 days</SelectItem>
                                              <SelectItem value="30 days">30 days</SelectItem>
                                              <SelectItem value="permanent">Permanent</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <DialogFooter>
                                          <Button 
                                            variant="outline" 
                                            onClick={() => setIsBanDialogOpen(false)}
                                            disabled={actionLoading}
                                          >
                                            Cancel
                                          </Button>
                                          <Button 
                                            variant="destructive"
                                            onClick={handleBanUser}
                                            disabled={actionLoading || !banDuration}
                                          >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                                            Ban User
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    {/* Delete User Dialog */}
                                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Delete User</DialogTitle>
                                          <DialogDescription>
                                            Are you sure you want to delete <span className="font-bold">{selectedUser?.name}</span>? This action cannot be undone.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                          <Button 
                                            variant="outline"
                                            onClick={() => setIsDeleteDialogOpen(false)}
                                            disabled={actionLoading}
                                          >
                                            Cancel
                                          </Button>
                                          <Button 
                                            variant="destructive"
                                            onClick={handleDeleteUser}
                                            disabled={actionLoading}
                                          >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Delete User
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    </div>
                                    );
                                    };

 export default Users;

