import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, Download, Calendar, MapPin, Building, Briefcase, Clock, TrendingUp, Video, Phone, Bell, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { UpcomingInterviews } from '../Applications/UpcomingInterviews';

interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  applied_position?: string;
  resume_url?: string;
  interview_date?: string;
  interview_time?: string;
  interview_venue?: string;
  interview_mode?: string;
  interview_link?: string;
  interview_notes?: string;
  interview_scheduled_at?: string;
  interview_rescheduled_count?: number;
  reschedule_reason?: string;
  job?: {
    title: string;
    location: string;
    company_name?: string;
  };
}

const CandidateApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (candidateError) throw candidateError;

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(title, location, company_name)
        `)
        .eq('candidate_id', candidateData.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResume = (resumeUrl: string) => {
    setSelectedResumeUrl(resumeUrl);
    setIsResumeModalOpen(true);
  };

  const handleDownloadResume = (resumeUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = resumeUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return {
          color: 'bg-blue-500',
          bgGradient: 'from-blue-50 to-blue-100',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '📝',
          text: 'Applied'
        };
      case 'under_review':
        return {
          color: 'bg-yellow-500',
          bgGradient: 'from-yellow-50 to-yellow-100',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: '👀',
          text: 'Under Review'
        };
      case 'interview_scheduled':
        return {
          color: 'bg-purple-500',
          bgGradient: 'from-purple-50 to-purple-100',
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: '📅',
          text: 'Interview Scheduled'
        };
      case 'rejected':
        return {
          color: 'bg-red-500',
          bgGradient: 'from-red-50 to-red-100',
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: '❌',
          text: 'Rejected'
        };
      case 'hired':
        return {
          color: 'bg-green-500',
          bgGradient: 'from-green-50 to-green-100',
          badge: 'bg-green-100 text-green-800 border-green-300',
          icon: '🎉',
          text: 'Hired'
        };
      default:
        return {
          color: 'bg-gray-500',
          bgGradient: 'from-gray-50 to-gray-100',
          badge: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '📋',
          text: status
        };
    }
  };

  const getCardSize = (index: number) => {
    const pattern = [
      'md:col-span-2 md:row-span-1',
      'md:col-span-1 md:row-span-1',
      'md:col-span-1 md:row-span-1',
      'md:col-span-1 md:row-span-1',
      'md:col-span-2 md:row-span-1',
    ];
    return pattern[index % pattern.length];
  };

  const isInterviewUpcoming = (interviewDate: string, interviewTime: string) => {
    const now = new Date();
    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
    return interviewDateTime > now;
  };

  const getTimeUntilInterview = (interviewDate: string, interviewTime: string) => {
    const now = new Date();
    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
    const diff = interviewDateTime.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  const addToCalendar = (application: Application) => {
    if (!application.interview_date || !application.interview_time) return;

    const startDate = new Date(`${application.interview_date}T${application.interview_time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = `Interview: ${application.job?.title}`;
    const description = `Interview for ${application.job?.title} at ${application.job?.company_name}\n\n${application.interview_notes || ''}`;
    const location = application.interview_mode === 'video' 
      ? application.interview_link 
      : application.interview_venue || '';

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    window.open(googleCalendarUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10 rounded-2xl blur-3xl"></div>
        <div className="relative">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Applications
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your job application journey
          </p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">Total: {applications.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-muted-foreground">
                In Review: {applications.filter(a => a.status === 'under_review').length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-muted-foreground">
                Interviews: {applications.filter(a => a.status === 'interview_scheduled').length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">
                Hired: {applications.filter(a => a.status === 'hired').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground mb-4">Start applying to jobs to see them here</p>
            <Button>Browse Jobs</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
          {applications.map((application, index) => {
            const statusConfig = getStatusConfig(application.status);
            const daysSinceApplied = Math.floor(
              (new Date().getTime() - new Date(application.applied_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            const hasInterview = application.status === 'interview_scheduled' && application.interview_date;
            const isUpcoming = hasInterview && isInterviewUpcoming(application.interview_date!, application.interview_time!);

            return (
              <Card
                key={application.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2",
                  getCardSize(index),
                  "bg-gradient-to-br",
                  statusConfig.bgGradient
                )}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Status indicator bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", statusConfig.color)}></div>

                {/* Upcoming Interview Indicator */}
                {isUpcoming && (
                  <div className="absolute top-2 right-2 z-20">
                    <div className="relative">
                      <Bell className="h-5 w-5 text-purple-600 animate-bounce" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                    </div>
                  </div>
                )}

                <CardContent className="p-6 relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{statusConfig.icon}</span>
                        <Badge className={cn("border", statusConfig.badge)}>
                          {statusConfig.text}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {application.job?.title || 'Job Position'}
                      </h3>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">
                        {application.job?.company_name || 'Company Name'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-purple-500" />
                      <span>{application.job?.location || 'Location'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>{daysSinceApplied} days ago</span>
                    </div>
                  </div>

                  {/* Interview Details Section */}
                  {hasInterview && (
                    <div className={cn(
                      "mb-4 p-4 rounded-lg border-2",
                      isUpcoming 
                        ? "bg-purple-50 border-purple-300" 
                        : "bg-gray-50 border-gray-300"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-purple-900 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Interview Details
                        </h4>
                        {isUpcoming && (
                          <Badge className="bg-purple-600 text-white">
                            {getTimeUntilInterview(application.interview_date!, application.interview_time!)}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        {/* Date */}
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-purple-900">Date</p>
                            <p className="text-gray-700">
                              {new Date(application.interview_date!).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-purple-900">Time</p>
                            <p className="text-gray-700">{application.interview_time}</p>
                          </div>
                        </div>

                        {/* Mode */}
                        <div className="flex items-start gap-2">
                          {application.interview_mode === 'video' && <Video className="h-4 w-4 text-purple-600 mt-0.5" />}
                          {application.interview_mode === 'in-person' && <MapPin className="h-4 w-4 text-purple-600 mt-0.5" />}
                          {application.interview_mode === 'phone' && <Phone className="h-4 w-4 text-purple-600 mt-0.5" />}
                          <div className="flex-1">
                            <p className="font-semibold text-purple-900">
                              {application.interview_mode === 'video' && 'Video Call'}
                              {application.interview_mode === 'in-person' && 'In-Person'}
                              {application.interview_mode === 'phone' && 'Phone Interview'}
                            </p>
                            {application.interview_mode === 'video' && application.interview_link && (
                              <a 
                                href={application.interview_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline break-all"
                              >
                                {application.interview_link}
                              </a>
                            )}
                            {application.interview_mode === 'in-person' && application.interview_venue && (
                              <p className="text-gray-700">{application.interview_venue}</p>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        {application.interview_notes && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-purple-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-purple-900">Additional Notes</p>
                              <p className="text-gray-700 text-xs">{application.interview_notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Rescheduled Info */}
                        {application.interview_rescheduled_count && application.interview_rescheduled_count > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs text-yellow-800">
                              ⚠️ This interview has been rescheduled {application.interview_rescheduled_count} time{application.interview_rescheduled_count > 1 ? 's' : ''}
                            </p>
                            {application.reschedule_reason && (
                              <p className="text-xs text-yellow-700 mt-1">
                                Reason: {application.reschedule_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Add to Calendar Button */}
                      {isUpcoming && (
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                          onClick={() => addToCalendar(application)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Add to Calendar
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Progress indicator */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Application Progress</span>
                      <span className="font-medium">
                        {application.status === 'applied' && '25%'}
                        {application.status === 'under_review' && '50%'}
                        {application.status === 'interview_scheduled' && '75%'}
                        {application.status === 'rejected' && '0%'}
                        {application.status === 'hired' && '100%'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          statusConfig.color
                        )}
                        style={{
                          width:
                            application.status === 'applied'
                              ? '25%'
                              : application.status === 'under_review'
                              ? '50%'
                              : application.status === 'interview_scheduled'
                              ? '75%'
                              : application.status === 'rejected'
                              ? '0%'
                              : '100%',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {application.resume_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResume(application.resume_url!)}
                          className="flex-1 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadResume(
                              application.resume_url!,
                              `Resume_${application.job?.title || 'Application'}.pdf`
                            )
                          }
                          className="flex-1 group-hover:border-purple-500 group-hover:text-purple-600 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>

                {/* Decorative corner */}
                <div className={cn(
                  "absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-20",
                  statusConfig.color
                )}></div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resume View Modal */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Resume Preview
            </DialogTitle>
          </DialogHeader>
          {selectedResumeUrl && (
            <div className="w-full h-[70vh] rounded-lg overflow-hidden border-2">
              <iframe
                src={selectedResumeUrl}
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

export default CandidateApplications;