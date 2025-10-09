import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, FileText, Plus, XCircle } from 'lucide-react';
import { useRecruiter } from '@/hooks/useRecruiter';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, fetchRecruiterStats } = useRecruiter();
  const [stats, setStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (profile) {
        setDataLoading(true);
        console.log('Loading stats for profile:', profile);
        const fetchedStats = await fetchRecruiterStats();
        console.log('Fetched stats:', fetchedStats);
        setStats(fetchedStats);
        setDataLoading(false);
      } else if (!profileLoading) {
        setDataLoading(false);
      }
    };
    loadStats();
  }, [profile, profileLoading]);

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
    <div className="space-y-6">
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