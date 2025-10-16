import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FileText, User, Search, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    applicationsSent: 0,
    profileViews: 0,
    interviewsScheduled: 0,
    jobAlerts: 0,
    notifications: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification popover state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

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

  const fetchUserRoleId = async (email) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('email', email)
      .single();
    if (error || !data) return null;
    return data.id;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id, skills')
        .eq('user_id', user?.id)
        .single();

      if (candidateError || !candidateData) return;

      const userRoleId = await fetchUserRoleId(user.email);

      let jobAlertsCount = 0;
      if (candidateData.skills && candidateData.skills.length > 0) {
        const { count: jobAlerts } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .overlaps('skills_required', candidateData.skills);
        jobAlertsCount = jobAlerts || 0;
      }

      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id);

      const { count: profileViewsCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id);

      const { count: interviewsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id)
        .eq('status', 'interview_scheduled');

      const { data: recentApps } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          jobs (
            title,
            recruiters (
              company_name
            )
          )
        `)
        .eq('candidate_id', candidateData.id)
        .order('applied_at', { ascending: false })
        .limit(3);

      const formattedApps = (recentApps || []).map((app) => ({
        id: app.id,
        jobTitle: app.jobs?.title || 'N/A',
        company: app.jobs?.recruiters?.company_name || 'N/A',
        status: app.status,
        appliedAt: new Date(app.applied_at).toLocaleDateString(),
      }));

      let notificationsCount = 0;
      let notifList = [];
      if (userRoleId) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userRoleId)
          .eq('is_read', false);
        notificationsCount = count || 0;

        const { data } = await supabase
          .from('notifications')
          .select('id, type, data, is_read, created_at')
          .eq('user_id', userRoleId)
          .order('created_at', { ascending: false })
          .limit(10);
        notifList = data || [];
      }

      setStats({
        applicationsSent: applicationsCount || 0,
        profileViews: profileViewsCount || 0,
        interviewsScheduled: interviewsCount || 0,
        jobAlerts: jobAlertsCount,
        notifications: notificationsCount,
      });

      setRecentApplications(formattedApps);
      setNotifications(notifList);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    { title: 'Applications Sent', value: stats.applicationsSent, icon: FileText, color: 'text-blue-600' },
    { title: 'Profile Views', value: stats.profileViews, icon: User, color: 'text-orange-500' },
    { title: 'Interviews Scheduled', value: stats.interviewsScheduled, icon: Briefcase, color: 'text-green-600' },
    { title: 'Job Alerts', value: stats.jobAlerts, icon: Search, color: 'text-purple-600' },
    { title: 'Notifications', value: stats.notifications, icon: Bell, color: 'text-yellow-500' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'interview_scheduled': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Only update local notification state and stats, no dashboard refresh!
  const markNotificationAsRead = async (id) => {
    const userRoleId = await fetchUserRoleId(user.email);
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userRoleId);

    // Optimistically update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setStats((prev) => ({
      ...prev,
      notifications: Math.max(0, prev.notifications - 1),
    }));
  };

  // Subscribe to notifications for real-time updates
  useEffect(() => {
    if (!user) return;
    let subscription;
    const subscribeToNotifications = async () => {
      const userRoleId = await fetchUserRoleId(user.email);
      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userRoleId}`,
          },
          () => fetchDashboardData()
        )
        .subscribe();
    };
    subscribeToNotifications();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Notification Bell Icon - absolutely positioned top-right, just below navbar, slightly higher */}
      <div className="absolute top-2 right-10 z-50" ref={notifRef}>
        <button
          type="button"
          className="relative bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg rounded-full p-3 hover:scale-110 transition"
          onClick={() => setNotifOpen((open) => !open)}
          aria-label="Show Notifications"
        >
          <Bell className="h-7 w-7 text-white" />
          {stats.notifications > 0 && (
            <span className="absolute -top-2 -right-2 bg-pink-600 text-white rounded-full text-xs px-2 py-0.5 font-bold shadow">
              {stats.notifications}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            className="absolute right-0 mt-2 w-[420px] bg-white bg-opacity-95 border border-purple-300 rounded-xl shadow-2xl overflow-y-auto ring-2 ring-pink-200 z-50"
            style={{ maxHeight: '60vh', boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)' }}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500/30 to-pink-500/20 border-b border-purple-200">
              <span className="font-bold text-lg text-purple-700">Notifications</span>
            </div>
            <div className="divide-y divide-purple-100">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-center justify-between gap-3 px-5 py-4 bg-white/60 border-none
                      ${!notification.is_read ? "ring-2 ring-pink-200" : ""}`}
                  >
                    <div className="pr-2 flex-1">
                      <h3 className={`font-semibold text-base mb-1 ${!notification.is_read ? "text-pink-700" : "text-purple-500"}`}>
                        {notification.type === 'job_alert' ? '✨ New Job Alert' : notification.type}
                      </h3>
                      {notification.data?.job_title && (
                        <p className="text-[1rem] leading-snug text-purple-700 font-medium mb-1">
                          {notification.data.job_title} at {notification.data.company} ({notification.data.location})
                        </p>
                      )}
                      <p className="text-xs text-purple-400">
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
                          ? "border-purple-300 text-purple-300"
                          : "bg-pink-500 text-white hover:bg-pink-600"
                      }`}
                    >
                      {notification.is_read ? 'Read' : 'Mark as read'}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center text-purple-400 py-8">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-purple-400 opacity-60" />
                  <p>No notifications yet!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Candidate Dashboard Content - minimal gap above */}
      <div className="pt-4">
        <h1 className="text-3xl font-bold text-foreground">Candidate Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your job applications and discover new opportunities
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
            Manage your candidate activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate('/jobs')}>
              <Search className="h-4 w-4 mr-2" />
              Browse Jobs
            </Button>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
            <Button variant="outline" onClick={() => navigate('/applications')}>
              <FileText className="h-4 w-4 mr-2" />
              My Applications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Your latest job applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplications.length > 0 ? (
              recentApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/applications')}
                >
                  <div>
                    <h3 className="font-medium">{application.jobTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {application.company} • Applied on {application.appliedAt}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      application.status
                    )}`}
                  >
                    {application.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No applications yet. Start applying to jobs!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDashboard;
