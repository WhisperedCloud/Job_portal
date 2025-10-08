import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FileText, User, Search } from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidate';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, fetchCandidateStats } = useCandidate();
  const [stats, setStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch stats when profile loads
  useEffect(() => {
    const loadStats = async () => {
      if (profile) {
        setDataLoading(true);
        const fetchedStats = await fetchCandidateStats();
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

  const dashboardStats = [
    { title: 'Applications Sent', value: stats?.totalApplications || 0, icon: FileText },
    { title: 'Profile Views', value: stats?.profileViews || 0, icon: User },
    { title: 'Interviews Scheduled', value: stats?.interviewsScheduled || 0, icon: Briefcase },
    { title: 'Job Alerts', value: stats?.jobAlerts || 0, icon: Search },
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
                  <Icon 
                    className={`h-8 w-8 ${
                      stat.title === 'Interviews Scheduled' && stat.value > 0 
                        ? 'text-purple-600' 
                        : 'text-muted-foreground'
                    }`} 
                  />
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
              View Applications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Your latest job applications and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentApplications?.length > 0 ? (
              stats.recentApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/applications')}
                >
                  <div>
                    <h3 className="font-medium">{application.jobTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {application.company} • Applied {application.appliedAt}
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
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  No applications yet. Start browsing jobs!
                </p>
                <Button onClick={() => navigate('/jobs')}>
                  <Search className="h-4 w-4 mr-2" />
                  Browse Available Jobs
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDashboard;