import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FileText, User, Search } from 'lucide-react';
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
    jobAlerts: 8,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get candidate profile
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (candidateError) {
        console.error('Error fetching candidate:', candidateError);
        return;
      }

      // Fetch applications count
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id);

      // Fetch profile views count
      const { count: profileViewsCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id);

      // Fetch interviews scheduled count
      const { count: interviewsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateData.id)
        .eq('status', 'interview_scheduled');

      // Fetch recent applications
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

      const formattedApps = (recentApps || []).map((app: any) => ({
        id: app.id,
        jobTitle: app.jobs?.title || 'N/A',
        company: app.jobs?.recruiters?.company_name || 'N/A',
        status: app.status,
        appliedAt: new Date(app.applied_at).toISOString().split('T')[0],
      }));

      setStats({
        applicationsSent: applicationsCount || 0,
        profileViews: profileViewsCount || 0,
        interviewsScheduled: interviewsCount || 0,
        jobAlerts: 8,
      });

      setRecentApplications(formattedApps);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    { title: 'Applications Sent', value: stats.applicationsSent.toString(), icon: FileText },
    { title: 'Profile Views', value: stats.profileViews.toString(), icon: User },
    { title: 'Interviews Scheduled', value: stats.interviewsScheduled.toString(), icon: Briefcase },
    { title: 'Job Alerts', value: stats.jobAlerts.toString(), icon: Search },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
    <div className="space-y-6">
      <div>
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
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
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
            Get started with these common tasks
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
              recentApplications.map((application: any) => (
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
              <p className="text-center text-muted-foreground py-4">
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