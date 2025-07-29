
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, FileText, Plus } from 'lucide-react';

const RecruiterDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    { title: 'Active Jobs', value: '8', icon: Briefcase },
    { title: 'Total Applications', value: '124', icon: FileText },
    { title: 'Candidates Shortlisted', value: '23', icon: Users },
    { title: 'Interviews Scheduled', value: '12', icon: Users },
  ];

  const recentJobs = [
    {
      id: '1',
      title: 'Senior Frontend Developer',
      applications: 45,
      status: 'active',
      postedAt: '2024-01-10',
    },
    {
      id: '2',
      title: 'React Developer',
      applications: 32,
      status: 'active',
      postedAt: '2024-01-08',
    },
    {
      id: '3',
      title: 'Backend Developer',
      applications: 28,
      status: 'paused',
      postedAt: '2024-01-05',
    },
  ];

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
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruiterDashboard;
