
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FileText, User, Search } from 'lucide-react';

const CandidateDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    { title: 'Applications Sent', value: '12', icon: FileText },
    { title: 'Profile Views', value: '45', icon: User },
    { title: 'Interviews Scheduled', value: '3', icon: Briefcase },
    { title: 'Job Alerts', value: '8', icon: Search },
  ];

  const recentApplications = [
    {
      id: '1',
      jobTitle: 'Frontend Developer',
      company: 'Tech Corp',
      status: 'under_review',
      appliedAt: '2024-01-15',
    },
    {
      id: '2',
      jobTitle: 'React Developer',
      company: 'StartupXYZ',
      status: 'applied',
      appliedAt: '2024-01-14',
    },
    {
      id: '3',
      jobTitle: 'Full Stack Developer',
      company: 'Innovation Labs',
      status: 'rejected',
      appliedAt: '2024-01-12',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        {stats.map((stat) => {
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
            {recentApplications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDashboard;
