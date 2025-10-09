import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { Briefcase, Users, Eye, Edit, Trash2, Plus, Calendar, Loader2 } from 'lucide-react';
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
  const [selectedJob, setSelectedJob] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Function to calculate job status based on application_deadline
  const determineJobStatus = (applicationDeadline: string | null) => {
    if (!applicationDeadline) return 'active'; // No deadline means always active

    const deadline = new Date(applicationDeadline);
    const now = new Date();

    // Set time to end of day for deadline comparison
    deadline.setHours(23, 59, 59, 999);

    if (now <= deadline) {
      return 'active';
    } else {
      return 'closed';
    }
  };

  useEffect(() => {
    fetchPostedJobs();
  }, [profile]);

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
        .eq('recruiter_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posted jobs:', error);
        toast.error('Failed to load posted jobs');
        setJobs([]);
      } else {
        // Map the data to include the number of applications and determine status
        const jobsWithMetadata = data.map(job => ({
          ...job,
          status: determineJobStatus(job.application_deadline), // Dynamically set status based on deadline
          applications_count: job.applications.length,
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

  const handleView = (job) => {
    setSelectedJob(job);
    setIsViewModalOpen(true);
  };

  const handleEdit = (jobId: string) => {
    navigate(`/jobs/${jobId}/edit`);
  };

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast.success("Job deleted successfully!");
      fetchPostedJobs();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error(`Failed to delete job: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
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
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

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

            {/* Stats - Dynamic */}
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
                      <p className="text-2xl font-bold">{closedJobs}</p>
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
                      <p className="text-2xl font-bold">{totalApplications}</p>
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
              {filteredJobs.map((job) => {
                const daysUntilDeadline = getDaysUntilDeadline(job.application_deadline);
                return (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-semibold">{job.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(job.status)}>
                                {job.status.toUpperCase()}
                              </Badge>
                              {daysUntilDeadline !== null && job.status === 'active' && (
                                <Badge variant="outline" className="text-xs">
                                  {daysUntilDeadline > 0
                                    ? `${daysUntilDeadline} days left`
                                    : 'Deadline today'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                            <div>
                              <p className="text-sm text-muted-foreground">Deadline</p>
                              <p className="font-medium">
                                {job.application_deadline
                                  ? new Date(job.application_deadline).toLocaleDateString()
                                  : 'No deadline'}
                              </p>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground mb-1">Required Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {job.skills_required.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <strong>Posted:</strong> {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="ml-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(job)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(job.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(job.id, job.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* View Job Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>Complete job details</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{selectedJob.company_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedJob.location}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Qualification</Label>
                  <p className="font-medium capitalize">{selectedJob.qualification}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Experience Level</Label>
                  <p className="font-medium capitalize">{selectedJob.experience_level}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Notice Period</Label>
                  <p className="font-medium">{selectedJob.notice_period || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Salary Range</Label>
                  <p className="font-medium">{selectedJob.salary_range || 'Not disclosed'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Application Deadline</Label>
                  <p className="font-medium">
                    {selectedJob.application_deadline
                      ? new Date(selectedJob.application_deadline).toLocaleDateString()
                      : 'No deadline'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedJob.status)}>
                    {selectedJob.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Job Description</Label>
                <p className="mt-2 text-sm whitespace-pre-wrap">{selectedJob.job_description}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Required Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedJob.skills_required.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Applications Received</Label>
                <p className="font-medium text-2xl">{selectedJob.applications_count}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewModalOpen(false);
              navigate('/applications');
            }}>
              View Applications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostedJobs;