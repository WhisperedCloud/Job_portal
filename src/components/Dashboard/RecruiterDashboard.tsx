import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, FileText, Plus, XCircle, Bell } from 'lucide-react';
import { useRecruiter } from '@/hooks/useRecruiter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, fetchRecruiterStats } = useRecruiter();
  const [stats, setStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Notification popover state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const loadStats = async () => {
      if (profile) {
        setDataLoading(true);
        
        // Fetch stats and user role ID (for notifications) in parallel
        const [fetchedStats, userRoleId] = await Promise.all([
          fetchRecruiterStats(),
          fetchUserRoleId()
        ]);
        
        setStats(fetchedStats);

        if (userRoleId) {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userRoleId)
            .order('created_at', { ascending: false })
            .limit(10);
          setNotifications(notifs || []);
          setUnreadNotifs(notifs?.filter(n => !n.is_read).length || 0);
        }

        setDataLoading(false);
      } else if (!profileLoading) {
        setDataLoading(false);
      }
    };
    loadStats();
  }, [profile, profileLoading]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  const fetchUserRoleId = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();
    return data?.id || null;
  };

  const markNotificationAsRead = async (id) => {
    const roleId = await fetchUserRoleId();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', roleId);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadNotifs(prev => Math.max(0, prev - 1));
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    let subscription;
    const setupRealtime = async () => {
      const userRoleId = await fetchUserRoleId();
      if (!userRoleId) return;

      subscription = supabase
        .channel('recruiter_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userRoleId}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
            setUnreadNotifs(prev => prev + 1);
            toast.info('New notification received!');
          }
        )
        .subscribe();
    };
    setupRealtime();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const dashboardStats = [
    { title: 'Total Jobs', value: stats?.totalJobs || 0, icon: Briefcase, color: 'text-muted-foreground' },
    { title: 'Active Jobs', value: stats?.activeJobs || 0, icon: Briefcase, color: 'text-green-600' },
    { title: 'Closed Jobs', value: stats?.closedJobs || 0, icon: XCircle, color: 'text-red-600' },
    { title: 'Total Applications', value: stats?.totalApplications || 0, icon: FileText, color: 'text-blue-600' },
  ];

  if (profileLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Notification Bell Icon */}
      <div className="absolute top-2 right-10 z-50" ref={notifRef}>
        <button
          type="button"
          className="relative bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-lg rounded-full p-3 hover:scale-110 transition"
          onClick={() => setNotifOpen((open) => !open)}
          aria-label="Show Notifications"
        >
          <Bell className="h-7 w-7 text-white" />
          {unreadNotifs > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs px-2 py-0.5 font-bold shadow">
              {unreadNotifs}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            className="absolute right-0 mt-2 w-[420px] bg-white bg-opacity-95 border border-indigo-300 rounded-xl shadow-2xl overflow-y-auto ring-2 ring-indigo-200 z-50"
            style={{ maxHeight: '60vh', boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)' }}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/30 to-purple-500/20 border-b border-indigo-200">
              <span className="font-bold text-lg text-indigo-700">Recruiter Notifications</span>
            </div>
            <div className="divide-y divide-indigo-100">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-center justify-between gap-3 px-5 py-4 bg-white/60 border-none
                      ${!notification.is_read ? "ring-2 ring-indigo-200" : ""}`}
                  >
                    <div className="pr-2 flex-1">
                      <h3 className={`font-semibold text-base mb-1 ${!notification.is_read ? "text-indigo-700" : "text-slate-500"}`}>
                        {notification.type === 'application_received' ? '📄 New Application' : 'Notification'}
                      </h3>
                      {notification.data?.message && (
                        <p className="text-[1rem] leading-snug text-indigo-700 font-medium mb-1">
                          {notification.data.message}
                        </p>
                      )}
                      <p className="text-xs text-indigo-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={notification.is_read ? 'outline' : 'default'}
                      disabled={notification.is_read}
                      onClick={() => markNotificationAsRead(notification.id)}
                      className={`transition ml-2 ${
                        notification.is_read
                          ? "border-indigo-300 text-indigo-300"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                      }`}
                    >
                      {notification.is_read ? 'Read' : 'Mark as read'}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center text-indigo-400 py-8">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-indigo-400 opacity-60" />
                  <p>No notifications yet!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recruiter Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your job postings and find the best candidates
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage your recruitment activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate('/jobs/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Button>
            <Button variant="outline" onClick={() => navigate('/jobs/posted')}>
              <Briefcase className="h-4 w-4 mr-2" />
              Manage Jobs
            </Button>
            <Button variant="outline" onClick={() => navigate('/applications')}>
              <Users className="h-4 w-4 mr-2" />
              Review Applications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Job Postings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Job Postings</CardTitle>
          <CardDescription>
            Your latest job postings and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentJobs?.length > 0 ? (
              stats.recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/jobs/posted')}
                >
                  <div>
                    <h3 className="font-medium">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {job.applications} applications • Posted {job.postedAt}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent jobs found. Start posting!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruiterDashboard;