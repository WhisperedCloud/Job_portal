import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, Download, Calendar, MapPin, Clock, Video, Phone, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

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
    
    // Check for missed interviews every minute
    const intervalId = setInterval(() => {
      checkAndUpdateMissedInterviews();
    }, 60000);

    // Set up real-time subscription
    const channel = supabase
      .channel('application-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        (payload) => {
          console.log('Application updated:', payload);
          fetchApplications();
          
          if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'interview_scheduled') {
              toast.success('Interview scheduled! Check your applications for details.');
            } else if (payload.new.status === 'missed_interview') {
              toast.error('You missed an interview. Please contact the recruiter.');
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
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
      
      console.log('Fetched applications:', data);
      setApplications(data || []);
      
      // Check for missed interviews after fetching
      setTimeout(() => checkAndUpdateMissedInterviews(), 1000);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpdateMissedInterviews = async () => {
    try {
      const now = new Date();
      
      // Only check applications that are still marked as "interview_scheduled"
      const missedApplications = applications.filter(app => {
        // Interview is "missed" only if:
        // 1. Status is still "interview_scheduled" (candidate hasn't responded/attended)
        // 2. Interview date and time exist
        // 3. The interview datetime has passed
        if (app.status === 'interview_scheduled' && app.interview_date && app.interview_time) {
          const interviewDateTime = getInterviewDateTime(app.interview_date, app.interview_time);
          
          // Check if interview time has passed
          const isPast = interviewDateTime < now;
          
          if (isPast) {
            console.log(`Interview has passed for application ${app.id}:`, {
              interviewDateTime: interviewDateTime.toISOString(),
              now: now.toISOString(),
              title: app.job?.title
            });
          }
          
          return isPast;
        }
        return false;
      });

      if (missedApplications.length > 0) {
        console.log('Found missed interviews (candidates did not attend):', missedApplications.length);
        
        for (const app of missedApplications) {
          const { error } = await supabase
            .from('applications')
            .update({ 
              status: 'missed_interview',
              updated_at: new Date().toISOString()
            })
            .eq('id', app.id)
            .eq('status', 'interview_scheduled'); // Only update if still scheduled

          if (error) {
            console.error('Error updating missed interview:', error);
          } else {
            console.log('Updated application to missed_interview:', app.id);
            toast.warning(`You missed the interview for ${app.job?.title}. Please contact the recruiter.`, {
              duration: 5000,
            });
          }
        }
        
        // Refresh applications list
        await fetchApplications();
      }
    } catch (error) {
      console.error('Error checking missed interviews:', error);
    }
  };

  const handleViewResume = (resumeUrl: string) => {
    setSelectedResumeUrl(resumeUrl);
    setIsResumeModalOpen(true);
  };

  const handleDownloadResume = (resumeUrl: string, fileName: string) => {
    window.open(resumeUrl, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'missed_interview':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not set';
    
    try {
      if (timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const minute = minutes;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute} ${ampm}`;
      }
      
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getInterviewDateTime = (dateString: string, timeString: string) => {
    try {
      const datePart = new Date(dateString);
      const timeParts = timeString.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      const interviewDateTime = new Date(datePart);
      interviewDateTime.setHours(hours, minutes, 0, 0);
      
      return interviewDateTime;
    } catch (error) {
      console.error('Error creating interview datetime:', error);
      return new Date();
    }
  };

  const getTimeUntilInterview = (dateString: string, timeString: string) => {
    try {
      const interviewDateTime = getInterviewDateTime(dateString, timeString);
      const now = new Date();
      const diff = interviewDateTime.getTime() - now.getTime();

      if (diff < 0) {
        return 'Past';
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `in ${days} day${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        return 'Starting now!';
      }
    } catch (error) {
      console.error('Error calculating time until interview:', error);
      return '';
    }
  };

  const addToCalendar = (application: Application) => {
    if (!application.interview_date || !application.interview_time) {
      toast.error('Interview date or time not set');
      return;
    }

    try {
      const startDate = getInterviewDateTime(application.interview_date, application.interview_time);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const formatDateForCalendar = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const title = `Interview: ${application.job?.title || 'Job Interview'}`;
      const companyName = application.job?.company_name || 'Company';
      
      let description = `Interview for ${application.job?.title || 'position'} at ${companyName}\n\n`;
      description += `Date: ${formatDate(application.interview_date)}\n`;
      description += `Time: ${formatTime(application.interview_time)}\n\n`;
      
      if (application.interview_mode === 'video' && application.interview_link) {
        description += `Join via: ${application.interview_link}\n\n`;
      } else if (application.interview_mode === 'in-person' && application.interview_venue) {
        description += `Location: ${application.interview_venue}\n\n`;
      } else if (application.interview_mode === 'phone') {
        description += `Mode: Phone Interview\n\n`;
      }
      
      if (application.interview_notes) {
        description += `Notes: ${application.interview_notes}`;
      }

      const location = application.interview_mode === 'video' 
        ? application.interview_link || 'Video Call'
        : application.interview_mode === 'in-person'
        ? application.interview_venue || 'Office'
        : 'Phone Interview';

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

      window.open(googleCalendarUrl, '_blank');
      toast.success('Opening Google Calendar...');
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast.error('Failed to create calendar event');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-2">
          Track your job applications
        </p>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No applications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const hasInterview = (application.status === 'interview_scheduled' || application.status === 'missed_interview') 
              && application.interview_date && application.interview_time;
            const timeUntil = hasInterview && application.status === 'interview_scheduled' 
              ? getTimeUntilInterview(application.interview_date!, application.interview_time!) 
              : '';
            const isMissed = application.status === 'missed_interview';

            return (
              <Card key={application.id} className={`hover:shadow-md transition-shadow ${isMissed ? 'border-2 border-orange-300' : ''}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{application.job?.title || 'Job Position'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {application.job?.company_name || 'Company Name'}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap justify-end">
                        <Badge className={getStatusColor(application.status)}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {hasInterview && !isMissed && timeUntil && timeUntil !== 'Past' && (
                          <Badge className="bg-purple-600 text-white">
                            {timeUntil}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{application.job?.location || 'Location'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Missed Interview Warning */}
                    {isMissed && hasInterview && (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-orange-900 mb-2 text-lg">⚠️ Missed Interview</h4>
                            <p className="text-sm text-orange-800 mb-3">
                              You did not attend your scheduled interview:
                            </p>
                            <div className="space-y-2 bg-white p-3 rounded border border-orange-200">
                              <p className="font-semibold text-orange-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(application.interview_date!)}
                              </p>
                              <p className="font-semibold text-orange-900 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formatTime(application.interview_time!)}
                              </p>
                              {application.interview_mode === 'video' && application.interview_link && (
                                <p className="text-sm text-orange-800 flex items-center gap-2">
                                  <Video className="h-4 w-4" />
                                  Video Call
                                </p>
                              )}
                              {application.interview_mode === 'in-person' && application.interview_venue && (
                                <p className="text-sm text-orange-800 flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {application.interview_venue}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-300">
                              <p className="text-sm text-orange-900 font-medium">
                                💡 <strong>Next Steps:</strong>
                              </p>
                              <ul className="text-sm text-orange-800 mt-1 list-disc list-inside space-y-1">
                                <li>Contact the recruiter immediately</li>
                                <li>Explain your absence</li>
                                <li>Request to reschedule if possible</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interview Details Section - Only show for upcoming interviews */}
                    {hasInterview && !isMissed && timeUntil !== 'Past' && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Interview Scheduled
                        </h4>

                        <div className="space-y-3">
                          {/* Date */}
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-purple-900">Date</p>
                              <p className="text-gray-700">
                                {formatDate(application.interview_date!)}
                              </p>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-purple-900">Time</p>
                              <p className="text-gray-700 text-lg font-medium">
                                {formatTime(application.interview_time!)}
                              </p>
                            </div>
                          </div>

                          {/* Mode & Location */}
                          {application.interview_mode === 'video' && application.interview_link && (
                            <div className="flex items-start gap-3">
                              <Video className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-purple-900">Video Call</p>
                                <a 
                                  href={application.interview_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline break-all text-sm flex items-center gap-1"
                                >
                                  Join Meeting <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          )}

                          {application.interview_mode === 'in-person' && application.interview_venue && (
                            <div className="flex items-start gap-3">
                              <MapPin className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-purple-900">Venue</p>
                                <p className="text-gray-700">{application.interview_venue}</p>
                              </div>
                            </div>
                          )}

                          {application.interview_mode === 'phone' && (
                            <div className="flex items-start gap-3">
                              <Phone className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-purple-900">Phone Interview</p>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {application.interview_notes && (
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-purple-900">Additional Notes</p>
                                <p className="text-gray-700 text-sm">{application.interview_notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Rescheduled Info */}
                          {application.interview_rescheduled_count && application.interview_rescheduled_count > 0 && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm text-yellow-800 font-medium">
                                ⚠️ This interview has been rescheduled {application.interview_rescheduled_count} time{application.interview_rescheduled_count > 1 ? 's' : ''}
                              </p>
                              {application.reschedule_reason && (
                                <p className="text-sm text-yellow-700 mt-1">
                                  Reason: {application.reschedule_reason}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Add to Calendar Button */}
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                            onClick={() => addToCalendar(application)}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Add to Google Calendar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 border-t pt-4">
                      {application.resume_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResume(application.resume_url!)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Resume
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadResume(application.resume_url!, `Resume_${application.job?.title}.pdf`)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resume Preview Modal */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
          </DialogHeader>
          {selectedResumeUrl && (
            <div className="w-full h-[70vh]">
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