import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Clock, MapPin, Video, Phone, Bell, Building, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Interview {
  id: string;
  interview_date: string;
  interview_time: string;
  interview_venue?: string;
  interview_mode: string;
  interview_link?: string;
  interview_notes?: string;
  interview_rescheduled_count?: number;
  reschedule_reason?: string;
  job: {
    title: string;
    company_name: string;
    location: string;
  };
}

export const UpcomingInterviews = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingInterviews();
  }, [user]);

  const fetchUpcomingInterviews = async () => {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (candidateError) throw candidateError;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          interview_date,
          -- interview_time,
          interview_venue,
          interview_mode,
          interview_link,
          interview_notes,
          interview_rescheduled_count,
          reschedule_reason,
          job:jobs(title, company_name, location)
        `)
        .eq('candidate_id', candidateData.id)
        .eq('status', 'interview_scheduled')
        .gte('interview_date', now.split('T')[0])
        .order('interview_date', { ascending: true });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const addToCalendar = (interview: Interview) => {
    const startDate = new Date(`${interview.interview_date}T${interview.interview_time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = `Interview: ${interview.job.title}`;
    const description = `Interview for ${interview.job.title} at ${interview.job.company_name}\n\n${interview.interview_notes || ''}`;
    const location = interview.interview_mode === 'video' 
      ? interview.interview_link 
      : interview.interview_venue || '';

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    window.open(googleCalendarUrl, '_blank');
  };

  const getTimeUntilInterview = (interviewDate: string, interviewTime: string) => {
    const now = new Date();
    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
    const diff = interviewDateTime.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} away`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} away`;
    } else {
      return 'Starting soon!';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Interviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No upcoming interviews scheduled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Bell className="h-5 w-5 animate-pulse" />
          Upcoming Interviews ({interviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {interviews.map((interview) => (
            <Card key={interview.id} className="border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{interview.job.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {interview.job.company_name}
                      </p>
                    </div>
                    <Badge className="bg-purple-600 text-white">
                      {getTimeUntilInterview(interview.interview_date, interview.interview_time)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-semibold">
                          {new Date(interview.interview_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <p className="font-semibold">{interview.interview_time}</p>
                    </div>

                    {interview.interview_mode === 'video' && (
                      <div className="col-span-2 flex items-start gap-2 text-sm">
                        <Video className="h-4 w-4 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">Video Call</p>
                          {interview.interview_link && (
                            <a 
                              href={interview.interview_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all text-xs"
                            >
                              {interview.interview_link}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {interview.interview_mode === 'in-person' && (
                      <div className="col-span-2 flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">In-Person</p>
                          <p className="text-xs">{interview.interview_venue}</p>
                        </div>
                      </div>
                    )}

                    {interview.interview_mode === 'phone' && (
                      <div className="col-span-2 flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-purple-600" />
                        <p className="font-semibold">Phone Interview</p>
                      </div>
                    )}
                  </div>

                  {interview.interview_notes && (
                    <div className="flex items-start gap-2 text-sm bg-blue-50 p-2 rounded">
                      <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">Additional Notes:</p>
                        <p className="text-xs text-blue-800">{interview.interview_notes}</p>
                      </div>
                    </div>
                  )}

                  {interview.interview_rescheduled_count && interview.interview_rescheduled_count > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                      <p className="text-yellow-800 font-medium">
                        ⚠️ Rescheduled {interview.interview_rescheduled_count} time{interview.interview_rescheduled_count > 1 ? 's' : ''}
                      </p>
                      {interview.reschedule_reason && (
                        <p className="text-yellow-700 mt-1">Reason: {interview.reschedule_reason}</p>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                    onClick={() => addToCalendar(interview)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Google Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};