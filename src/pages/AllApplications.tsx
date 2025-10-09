import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Search, User, Building, Calendar, FileText, Download, Eye, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  company: string;
  appliedDate: string;
  status: string;
  location?: string;
  resumeUrl?: string;
  coverLetter?: string;
  skills: string[];
  matchScore?: number;
  candidate_id: string;
  job_id: string;
}

const AllApplications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for maximum speed
      const [appsResult, jobsResult, candidatesResult, recruitersResult, analysisResult] = await Promise.all([
        supabase.from('applications').select('*').order('applied_at', { ascending: false }),
        supabase.from('jobs').select('id, title, recruiter_id'),
        supabase.from('candidates').select('id, name, phone, location, skills, resume_url, user_id'),
        supabase.from('recruiters').select('id, company_name'),
        supabase.from('analysis_results').select('application_id, overall_match_score').order('created_at', { ascending: false })
      ]);

      if (appsResult.error) throw appsResult.error;

      // Create lookup maps for O(1) access
      const candidatesMap = new Map();
      (candidatesResult.data || []).forEach(c => candidatesMap.set(c.id, c));

      const jobsMap = new Map();
      (jobsResult.data || []).forEach(j => jobsMap.set(j.id, j));

      const recruitersMap = new Map();
      (recruitersResult.data || []).forEach(r => recruitersMap.set(r.id, r));

      // Get user emails from auth.users (need to fetch from candidates table which has user_id)
      const userIds = Array.from(new Set((candidatesResult.data || []).map(c => c.user_id)));
      const usersMap = new Map();
      
      // Fetch user data from auth metadata if needed
      for (const candidate of (candidatesResult.data || [])) {
        if (candidate.user_id) {
          // Try to get email from Supabase auth
          const { data: userData } = await supabase.auth.admin.getUserById(candidate.user_id);
          if (userData?.user?.email) {
            usersMap.set(candidate.user_id, userData.user.email);
          }
        }
      }

      const analysisMap = new Map();
      (analysisResult?.data || []).forEach(a => {
        if (!analysisMap.has(a.application_id)) {
          analysisMap.set(a.application_id, a.overall_match_score);
        }
      });

      // Build applications array
      const formattedApplications: Application[] = (appsResult.data || []).map((app: any) => {
        const candidate = candidatesMap.get(app.candidate_id);
        const job = jobsMap.get(app.job_id);
        const recruiter = job ? recruitersMap.get(job.recruiter_id) : null;
        const userEmail = candidate ? usersMap.get(candidate.user_id) : null;

        return {
          id: app.id,
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          candidateName: candidate?.name || 'Unknown',
          candidateEmail: userEmail || 'N/A',
          candidatePhone: candidate?.phone || 'N/A',
          jobTitle: job?.title || 'N/A',
          company: recruiter?.company_name || 'N/A',
          appliedDate: new Date(app.applied_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          status: app.status,
          location: candidate?.location || 'N/A',
          resumeUrl: candidate?.resume_url,
          coverLetter: app.cover_letter,
          skills: candidate?.skills || [],
          matchScore: analysisMap.get(app.id)
        };
      });

      setApplications(formattedApplications);
      setJobs(jobsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error(`Failed to load applications: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Application status updated to ${newStatus}`);
      await fetchAllData();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application status');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Job Title', 'Company', 'Status', 'Applied Date', 'Location'],
      ...filteredApplications.map(app => [
        app.candidateName,
        app.candidateEmail,
        app.jobTitle,
        app.company,
        app.status,
        app.appliedDate,
        app.location || 'N/A'
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Applications exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredApplications = applications.filter(application => {
    const matchesSearch = 
      application.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
    const matchesJob = jobFilter === 'all' || application.job_id === jobFilter;

    return matchesSearch && matchesStatus && matchesJob;
  });

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    interviewed: applications.filter(a => a.status === 'interview_scheduled').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-muted-foreground">Loading applications...</p>
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
                <h1 className="text-3xl font-bold text-foreground">All Applications</h1>
                <p className="text-muted-foreground mt-2">
                  Monitor and manage all applications across the platform
                </p>
              </div>
              <Button onClick={exportToCSV} disabled={filteredApplications.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Applied</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.underReview}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Interview</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.interviewed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Hired</p>
                    <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates, jobs, or companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {jobs.map(job => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Applications ({filteredApplications.length})</CardTitle>
                <CardDescription>
                  All job applications across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No applications found</p>
                    <p className="text-sm text-muted-foreground">
                      Applications will appear here once candidates start applying for jobs
                    </p>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No applications match your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied Date</TableHead>
                          <TableHead>Match Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplications.map((application) => (
                          <TableRow key={application.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{application.candidateName}</p>
                                  <p className="text-xs text-muted-foreground">{application.candidateEmail}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{application.jobTitle}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span>{application.company}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(application.status)}>
                                {application.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{application.appliedDate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {application.matchScore ? (
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-green-600">{application.matchScore}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not analyzed</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApplication(application);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {application.resumeUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResume(application.resumeUrl!);
                                      setIsResumeModalOpen(true);
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Application Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {selectedApplication?.candidateName} - {selectedApplication?.jobTitle}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Candidate Name</p>
                  <p className="font-medium">{selectedApplication.candidateName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedApplication.candidateEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedApplication.candidatePhone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedApplication.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Job Title</p>
                  <p className="font-medium">{selectedApplication.jobTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedApplication.company}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied Date</p>
                  <p className="font-medium">{selectedApplication.appliedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge className={getStatusColor(selectedApplication.status)}>
                    {selectedApplication.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {selectedApplication.skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedApplication.coverLetter && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Cover Letter</p>
                  <p className="text-sm bg-muted p-4 rounded-md">{selectedApplication.coverLetter}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'under_review')}
                    disabled={selectedApplication.status === 'under_review'}
                  >
                    Move to Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'interview_scheduled')}
                    disabled={selectedApplication.status === 'interview_scheduled'}
                  >
                    Schedule Interview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'hired')}
                    disabled={selectedApplication.status === 'hired'}
                  >
                    Mark as Hired
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                    disabled={selectedApplication.status === 'rejected'}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Preview Modal */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
          </DialogHeader>
          {selectedResume && (
            <div className="w-full h-[70vh]">
              <iframe
                src={selectedResume}
                className="w-full h-full border-0"
                title="Resume Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllApplications;