
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { Briefcase, Users, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PostedJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const mockJobs = [
    {
      id: '1',
      title: 'Senior Frontend Developer',
      experience: 'experienced',
      location: 'San Francisco, CA',
      applications: 45,
      status: 'active',
      postedAt: '2024-01-10',
      deadline: '2024-02-10',
      skills: ['React', 'TypeScript', 'Next.js'],
      description: 'We are looking for a senior frontend developer to join our team...',
    },
    {
      id: '2',
      title: 'React Developer',
      experience: 'fresher',
      location: 'New York, NY',
      applications: 32,
      status: 'active',
      postedAt: '2024-01-08',
      deadline: '2024-02-08',
      skills: ['React', 'JavaScript', 'CSS'],
      description: 'Great opportunity for fresh graduates to start their career...',
    },
    {
      id: '3',
      title: 'Backend Developer',
      experience: 'experienced',
      location: 'Austin, TX',
      applications: 28,
      status: 'paused',
      postedAt: '2024-01-05',
      deadline: '2024-02-05',
      skills: ['Node.js', 'MongoDB', 'Express'],
      description: 'Looking for an experienced backend developer...',
    },
    {
      id: '4',
      title: 'Full Stack Developer',
      experience: 'experienced',
      location: 'Remote',
      applications: 15,
      status: 'closed',
      postedAt: '2023-12-20',
      deadline: '2024-01-20',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      description: 'Remote full stack developer position...',
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

  const filteredJobs = mockJobs.filter(job => 
    statusFilter === 'all' || job.status === statusFilter
  );

  if (user?.role !== 'recruiter') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">This page is only available for recruiters.</p>
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
                <h1 className="text-3xl font-bold text-foreground">Posted Jobs</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your job postings and track applications
                </p>
              </div>
              <Button onClick={() => navigate('/jobs/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Jobs</p>
                      <p className="text-2xl font-bold">{mockJobs.length}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Jobs</p>
                      <p className="text-2xl font-bold">
                        {mockJobs.filter(job => job.status === 'active').length}
                      </p>
                    </div>
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="text-2xl font-bold">
                        {mockJobs.reduce((sum, job) => sum + job.applications, 0)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Applications</p>
                      <p className="text-2xl font-bold">
                        {Math.round(mockJobs.reduce((sum, job) => sum + job.applications, 0) / mockJobs.length)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground">
                    {filteredJobs.length} job(s) found
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Jobs List */}
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-semibold">{job.title}</h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{job.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Experience</p>
                            <p className="font-medium capitalize">{job.experience}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Applications</p>
                            <p className="font-medium">{job.applications}</p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-1">Required Skills</p>
                          <div className="flex gap-2">
                            {job.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <strong>Posted:</strong> {job.postedAt} | <strong>Deadline:</strong> {job.deadline}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PostedJobs;
