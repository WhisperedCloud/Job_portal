import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { 
  User, FileText, Calendar, Mail, Phone, MapPin, Download, 
  Eye, Loader2, TrendingUp, CheckCircle, XCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  cover_letter?: string;
  job?: {
    id: string;
    title: string;
    job_description: string;
  };
  candidate?: {
    id: string;
    name: string;
    phone?: string;
    location?: string;
    skills: string[];
    resume_url?: string;
    education?: string;
    experience?: string;
  };
  analysis?: {
    overall_match_score: number;
    key_skills_matched: string[];
    missing_skills: string[];
    summary: string;
    created_at: string;
  };
}

const RecruiterApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState('all');
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      // Get recruiter profile
      const { data: recruiterData, error: recruiterError } = await supabase
        .from('recruiters')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (recruiterError) throw recruiterError;

      // Fetch applications for this recruiter's jobs
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs!inner (
            id,
            title,
            job_description,
            recruiter_id
          ),
          candidate:candidates (
            id,
            name,
            phone,
            location,
            skills,
            resume_url,
            education,
            experience
          )
        `)
        .eq('job.recruiter_id', recruiterData.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch analysis results for each application
      const appsWithAnalysis = await Promise.all(
        (data || []).map(async (app) => {
          const { data: analysisData } = await supabase
            .from('analysis_results')
            .select('*')
            .eq('application_id', app.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...app,
            analysis: analysisData || null
          };
        })
      );

      setApplications(appsWithAnalysis);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const analyzeResume = async (application: Application) => {
    if (!application.candidate?.resume_url || !application.job) {
      toast.error('Resume or job description not available');
      return;
    }

    try {
      setAnalyzing(application.id);

      // Fetch resume content (you'll need to extract text from PDF)
      // For now, we'll use candidate info as a proxy
      const resumeText = `
        Name: ${application.candidate.name}
        Skills: ${application.candidate.skills.join(', ')}
        Education: ${application.candidate.education || 'N/A'}
        Experience: ${application.candidate.experience || 'N/A'}
        Location: ${application.candidate.location || 'N/A'}
      `;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: {
          resumeText,
          jobDescription: application.job.job_description,
          applicationId: application.id
        }
      });

      if (error) throw error;

      toast.success('Resume analyzed successfully!');
      
      // Refresh applications to show new analysis
      await fetchApplications();
      
    } catch (error: any) {
      console.error('Error analyzing resume:', error);
      toast.error(`Failed to analyze resume: ${error.message}`);
    } finally {
      setAnalyzing(null);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Application ${status}`);
      await fetchApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update application status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredApplications = selectedJob === 'all' 
    ? applications 
    : applications.filter(app => app.job?.id === selectedJob);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage candidate applications
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredApplications.length} applications
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {Array.from(new Set(applications.map(a => a.job?.id)))
                  .filter(Boolean)
                  .map(jobId => {
                    const app = applications.find(a => a.job?.id === jobId);
                    return (
                      <SelectItem key={jobId} value={jobId!}>
                        {app?.job?.title}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No applications found</p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{application.candidate?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Applied for: {application.job?.title}
                        </p>
                      </div>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {application.status === 'applied' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateApplicationStatus(application.id, 'under_review')}
                          >
                            Under Review
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => updateApplicationStatus(application.id, 'hired')}
                          >
                            Hire
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis Score */}
                  {application.analysis ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-blue-900">AI Match Score</span>
                        </div>
                        <Badge className={getScoreBadge(application.analysis.overall_match_score)}>
                          {application.analysis.overall_match_score}% Match
                        </Badge>
                      </div>
                      
                      <Progress 
                        value={application.analysis.overall_match_score} 
                        className="h-2 mb-3"
                      />

                      <p className="text-sm text-gray-700 mb-3">
                        {application.analysis.summary}
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Matched Skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {application.analysis.key_skills_matched.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Missing Skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {application.analysis.missing_skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeResume(application)}
                      disabled={analyzing === application.id}
                    >
                      {analyzing === application.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Analyze Resume with AI
                        </>
                      )}
                    </Button>
                  )}

                  {/* Candidate Details */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        {application.candidate?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{application.candidate.phone}</span>
                          </div>
                        )}
                        {application.candidate?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{application.candidate.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {application.candidate?.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter */}
                  {application.cover_letter && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Cover Letter</h4>
                      <p className="text-sm text-muted-foreground">
                        {application.cover_letter}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {application.candidate?.resume_url && (
                    <div className="border-t pt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedResume(application.candidate.resume_url!);
                          setIsResumeModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Resume
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(application.candidate?.resume_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

export default RecruiterApplications;