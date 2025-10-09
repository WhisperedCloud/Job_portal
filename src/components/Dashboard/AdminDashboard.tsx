import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, FileText, Settings, Monitor, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminStats {
  totalCandidates: number;
  totalRecruiters: number;
  activeJobs: number;
  closedJobs: number;
  totalApplications: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalCandidates: 0,
    totalRecruiters: 0,
    activeJobs: 0,
    closedJobs: 0,
    totalApplications: 0
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
    fetchRecentActivity();
  }, []);

  // Function to determine if job is closed based on application_deadline
  const isJobClosed = (applicationDeadline: string | null) => {
    if (!applicationDeadline) return false; // No deadline means always active
    
    const deadline = new Date(applicationDeadline);
    deadline.setHours(23, 59, 59, 999);
    const now = new Date();
    
    return now > deadline;
  };

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      // Fetch total candidates
      const { count: candidatesCount, error: candidatesError } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      if (candidatesError) throw candidatesError;

      // Fetch total recruiters
      const { count: recruitersCount, error: recruitersError } = await supabase
        .from('recruiters')
        .select('*', { count: 'exact', head: true });

      if (recruitersError) throw recruitersError;

      // Fetch all jobs with application_deadline
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('application_deadline');

      if (jobsError) throw jobsError;

      console.log('All jobs data:', jobsData);

      // Calculate active and closed jobs
      const now = new Date();
      let activeJobsCount = 0;
      let closedJobsCount = 0;

      jobsData?.forEach(job => {
        if (isJobClosed(job.application_deadline)) {
          closedJobsCount++;
        } else {
          activeJobsCount++;
        }
      });

      console.log('Jobs calculation:', {
        total: jobsData?.length,
        active: activeJobsCount,
        closed: closedJobsCount
      });

      // Fetch total applications
      const { count: applicationsCount, error: applicationsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      if (applicationsError) throw applicationsError;

      setStats({
        totalCandidates: candidatesCount || 0,
        totalRecruiters: recruitersCount || 0,
        activeJobs: activeJobsCount,
        closedJobs: closedJobsCount,
        totalApplications: applicationsCount || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: Activity[] = [];

      // Fetch recent user registrations (candidates)
      const { data: recentCandidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (!candidatesError && recentCandidates) {
        recentCandidates.forEach(candidate => {
          activities.push({
            id: `candidate-${candidate.name}`,
            type: 'New Registration',
            description: `${candidate.name} registered as a candidate`,
            timestamp: getTimeAgo(candidate.created_at)
          });
        });
      }

      // Fetch recent jobs posted
      const { data: recentJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('title, created_at, recruiters(company_name)')
        .order('created_at', { ascending: false })
        .limit(2);

      if (!jobsError && recentJobs) {
        recentJobs.forEach(job => {
          activities.push({
            id: `job-${job.title}`,
            type: 'Job Posted',
            description: `${job.recruiters?.company_name || 'A company'} posted "${job.title}" position`,
            timestamp: getTimeAgo(job.created_at)
          });
        });
      }

      // Fetch recent applications
      const { data: recentApps, error: appsError } = await supabase
        .from('applications')
        .select('applied_at, candidates(name), jobs(title)')
        .order('applied_at', { ascending: false })
        .limit(2);

      if (!appsError && recentApps) {
        recentApps.forEach(app => {
          activities.push({
            id: `app-${app.candidates?.name}`,
            type: 'Application Submitted',
            description: `${app.candidates?.name || 'A candidate'} applied for ${app.jobs?.title || 'a position'}`,
            timestamp: getTimeAgo(app.applied_at)
          });
        });
      }

      // Sort activities by timestamp and take top 5
      activities.sort((a, b) => {
        const timeA = parseTimeAgo(a.timestamp);
        const timeB = parseTimeAgo(b.timestamp);
        return timeA - timeB;
      });

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  const parseTimeAgo = (timeStr: string): number => {
    const parts = timeStr.split(' ');
    const value = parseInt(parts[0]);
    const unit = parts[1];

    if (unit.startsWith('minute')) return value;
    if (unit.startsWith('hour')) return value * 60;
    if (unit.startsWith('day')) return value * 1440;
    return 0;
  };

  const dashboardStats = [
    { title: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-blue-600' },
    { title: 'Total Recruiters', value: stats.totalRecruiters, icon: Users, color: 'text-green-600' },
    { title: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-green-600' },
    { title: 'Closed Jobs', value: stats.closedJobs, icon: XCircle, color: 'text-red-600' },
    { title: 'Total Applications', value: stats.totalApplications, icon: FileText, color: 'text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage the entire job portal platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
          <CardTitle>Administration</CardTitle>
          <CardDescription>
            Platform management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate('/users')}>
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" onClick={() => navigate('/jobs')}>
              <Briefcase className="h-4 w-4 mr-2" />
              Review Jobs
            </Button>
            <Button variant="outline" onClick={() => navigate('/applications-monitor')}>
              <Monitor className="h-4 w-4 mr-2" />
              Monitor Applications
            </Button>
            <Button variant="outline" onClick={() => navigate('/all-applications')}>
              <FileText className="h-4 w-4 mr-2" />
              All Applications
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Platform Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
          <CardDescription>
            Latest activities across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{activity.type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;