
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, FileText, Settings, Monitor } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    { title: 'Total Candidates', value: '1,247', icon: Users },
    { title: 'Total Recruiters', value: '89', icon: Users },
    { title: 'Active Jobs', value: '156', icon: Briefcase },
    { title: 'Total Applications', value: '3,421', icon: FileText },
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'New Registration',
      description: 'John Doe registered as a candidate',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'Job Posted',
      description: 'TechCorp posted "Senior Developer" position',
      timestamp: '4 hours ago',
    },
    {
      id: '3',
      type: 'Application Submitted',
      description: 'Jane Smith applied for Frontend Developer role',
      timestamp: '6 hours ago',
    },
    {
      id: '4',
      type: 'New Registration',
      description: 'StartupXYZ registered as a recruiter',
      timestamp: '8 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage the entire job portal platform
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
            {recentActivity.map((activity) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
