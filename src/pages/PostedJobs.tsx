import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { Briefcase, Users, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRecruiter } from '@/hooks/useRecruiter';

const PostedJobs = () => {
  const { user } = useAuth();
  const { profile } = useRecruiter();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to calculate job status based on creation date (2 months active period)
  const determineJobStatus = (createdAt: string | null) => {
    if (!createdAt) return 'draft';

    const createdDate = new Date(createdAt);
    const activeDeadline = new Date(createdDate);
    activeDeadline.setMonth(createdDate.getMonth() + 2); // 2 months active window

    const now = new Date();

    if (now < activeDeadline) {
      return 'active';
    } else {
      return 'closed';
    }
  };

  useEffect(() => {
    // Fetch jobs when the component mounts or when the recruiter profile is available
    fetchPostedJobs();
  }, [profile]); // Depend on profile to ensure we have recruiter_id

  const fetchPostedJobs = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all jobs posted by the current recruiter, along with a count of applications for each
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          applications (id)
        `)
        .eq('recruiter_id', profile.id);

      if (error) {
        console.error('Error fetching posted jobs:', error);
        toast.error('Failed to load posted jobs');
        setJobs([]);
      } else {
        // Map the data to include the number of applications and determine status
        const jobsWithMetadata = data.map(job => ({
          ...job,
          status: determineJobStatus(job.created_at), // Dynamically set status
          applications_count: job.applications.length,
          // Use 'experience_level' from DB, which matches the enum, for display
          experience: job.experience_level 
        }));
        setJobs(jobsWithMetadata || []);
      }
    } catch (error) {
      console.error('Error fetching posted jobs:', error);
      toast.error('Failed to load posted jobs');
    } finally {
      setLoading(false);
    }
  };

  // Functionality for Edit, Delete, View buttons (Stubs for now)
  const handleView = (jobId: string) => {
    console.log('Viewing job:', jobId);
    // In a real app, this would navigate to a JobDetails page
    // navigate(`/jobs/${jobId}/details`);
  };

  const handleEdit = (jobId: string) => {
    console.log('Editing job:', jobId);
    // In a real app, this would navigate to an EditJob page
    // navigate(`/jobs/${jobId}/edit`);
  };
  
  const handleDelete = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job posting? This action cannot be undone.")) return;

    try {
        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);

        if (error) throw error;
        
        toast.success("Job deleted successfully!");
        // Refresh the list after successful deletion
        fetchPostedJobs();

    } catch (error) {
        console.error("Error deleting job:", error);
        toast.error(`Failed to delete job: ${error.message}`);
    }
  };
  
  // Helper function to get color based on job status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
      case 'draft':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Apply filter based on selected status
  const filteredJobs = jobs.filter(job => 
    statusFilter === 'all' || job.status === statusFilter
  );

  // Calculate summary stats
  const totalApplications = jobs.reduce((sum, job) => sum + job.applications_count, 0);
  const activeJobs = jobs.filter(job => job.status === 'active').length;
  const closedJobs = jobs.filter(job => job.status === 'closed').length;
  
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

  if (loading) {
    return <div>Loading jobs...</div>;
  }

  // Fallback if no jobs are posted
  if (jobs.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="text-center p-12 space-y-4">
              <h1 className="text-3xl font-bold text-foreground">Post Your First Job</h1>
              <p className="text-muted-foreground">No jobs found. Click the button below to start recruiting!</p>
              <Button onClick={() => navigate('/jobs/create')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
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

            {/* Stats - Now Dynamic */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Jobs</p>
                      <p className="text-2xl font-bold">{jobs.length}</p>
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
                      <p className="text-2xl font-bold">{activeJobs}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Closed Jobs</p>
                      <p className="2xl font-bold">{closedJobs}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="2xl font-bold">{totalApplications}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
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
                            {job.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{job.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Experience</p>
                            <p className="font-medium capitalize">{job.experience_level}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Applications</p>
                            <p className="font-medium">{job.applications_count}</p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-1">Required Skills</p>
                          <div className="flex gap-2">
                            {job.skills_required.map((skill, index) => (
                              <Badge key={index} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <strong>Posted:</strong> {new Date(job.created_at).toLocaleDateString()}
                          {/* Note: Deadline is not stored in DB, so we display Posted date */}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex gap-2">
                        {/* View Button - Placeholder for Job Details/Application List */}
                        <Button variant="outline" size="sm" onClick={() => handleView(job.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {/* Edit Button - Placeholder for Edit Job Page */}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(job.id)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {/* Delete Button - Functional Delete Operation */}
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(job.id)}>
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
