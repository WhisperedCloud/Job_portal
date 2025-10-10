import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, Video, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InterviewScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
  isReschedule?: boolean;
  onSuccess?: () => void;
}

export const InterviewScheduleDialog: React.FC<InterviewScheduleDialogProps> = ({
  open,
  onOpenChange,
  application,
  isReschedule = false,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interview_date: application?.interview_date || '',
    interview_time: application?.interview_time || '',
    interview_mode: application?.interview_mode || 'video',
    interview_venue: application?.interview_venue || '',
    interview_link: application?.interview_link || '',
    interview_notes: application?.interview_notes || '',
    reschedule_reason: ''
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.interview_date || !formData.interview_time) {
        toast.error('Please fill in date and time');
        return;
      }

      if (formData.interview_mode === 'in-person' && !formData.interview_venue) {
        toast.error('Please enter venue for in-person interview');
        return;
      }

      if (formData.interview_mode === 'video' && !formData.interview_link) {
        toast.error('Please enter meeting link for video interview');
        return;
      }

      // Update application with interview details
      const updateData: any = {
        interview_date: formData.interview_date,
        interview_time: formData.interview_time,
        interview_mode: formData.interview_mode,
        interview_venue: formData.interview_venue,
        interview_link: formData.interview_link,
        interview_notes: formData.interview_notes,
        interview_scheduled_at: new Date().toISOString(),
        status: 'interview_scheduled'
      };

      if (isReschedule) {
        updateData.interview_rescheduled_count = (application.interview_rescheduled_count || 0) + 1;
        updateData.reschedule_reason = formData.reschedule_reason;
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Send notification to candidate
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabase}/functions/v1/send-interview-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            candidateId: application.candidate_id,
            applicationId: application.id,
            interviewDate: formData.interview_date,
            interviewTime: formData.interview_time,
            interviewVenue: formData.interview_venue,
            interviewMode: formData.interview_mode,
            interviewLink: formData.interview_link,
            isReschedule,
            rescheduleReason: formData.reschedule_reason
          }),
        }
      );

      if (!response.ok) {
        console.error('Failed to send notification');
      }

      toast.success(isReschedule ? 'Interview rescheduled successfully!' : 'Interview scheduled successfully!');
      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error('Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isReschedule ? '📅 Reschedule Interview' : '📅 Schedule Interview'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {application?.first_name} {application?.last_name} • {application?.applied_position}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interview_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Interview Date *
              </Label>
              <Input
                id="interview_date"
                type="date"
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="interview_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Interview Time *
              </Label>
              <Input
                id="interview_time"
                type="time"
                value={formData.interview_time}
                onChange={(e) => setFormData({ ...formData, interview_time: e.target.value })}
              />
            </div>
          </div>

          {/* Interview Mode */}
          <div>
            <Label htmlFor="interview_mode">Interview Mode *</Label>
            <Select
              value={formData.interview_mode}
              onValueChange={(value) => setFormData({ ...formData, interview_mode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Call
                  </div>
                </SelectItem>
                <SelectItem value="in-person">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    In-Person
                  </div>
                </SelectItem>
                <SelectItem value="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Interview
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Venue (for in-person) */}
          {formData.interview_mode === 'in-person' && (
            <div>
              <Label htmlFor="interview_venue" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Venue/Address *
              </Label>
              <Input
                id="interview_venue"
                placeholder="Enter the interview location"
                value={formData.interview_venue}
                onChange={(e) => setFormData({ ...formData, interview_venue: e.target.value })}
              />
            </div>
          )}

          {/* Meeting Link (for video) */}
          {formData.interview_mode === 'video' && (
            <div>
              <Label htmlFor="interview_link" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Meeting Link *
              </Label>
              <Input
                id="interview_link"
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={formData.interview_link}
                onChange={(e) => setFormData({ ...formData, interview_link: e.target.value })}
              />
            </div>
          )}

          {/* Interview Notes */}
          <div>
            <Label htmlFor="interview_notes">Additional Notes (Optional)</Label>
            <Textarea
              id="interview_notes"
              placeholder="Any additional information for the candidate..."
              value={formData.interview_notes}
              onChange={(e) => setFormData({ ...formData, interview_notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Reschedule Reason */}
          {isReschedule && (
            <div>
              <Label htmlFor="reschedule_reason">Reason for Rescheduling</Label>
              <Textarea
                id="reschedule_reason"
                placeholder="Please provide a reason for rescheduling..."
                value={formData.reschedule_reason}
                onChange={(e) => setFormData({ ...formData, reschedule_reason: e.target.value })}
                rows={2}
              />
            </div>
          )}

          {/* Summary Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Interview Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>📅 Date: {formData.interview_date ? new Date(formData.interview_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}</p>
              <p>🕒 Time: {formData.interview_time || 'Not set'}</p>
              <p>💼 Mode: {formData.interview_mode === 'video' ? '💻 Video Call' : formData.interview_mode === 'in-person' ? '📍 In-Person' : '📞 Phone'}</p>
              {formData.interview_mode === 'in-person' && formData.interview_venue && (
                <p>📍 Venue: {formData.interview_venue}</p>
              )}
              {formData.interview_mode === 'video' && formData.interview_link && (
                <p>🔗 Link: {formData.interview_link}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Scheduling...' : isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};