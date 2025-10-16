import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/hooks/useCandidate';
import { toast } from 'sonner';

export const useJobApplication = () => {
  const { user } = useAuth();
  const { profile, uploadFile } = useCandidate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const submitApplication = async (
    jobId: string,
    resumeFile: File,
    coverLetter?: string
  ) => {
    if (!user || !profile) {
      throw new Error('User must be authenticated with a complete profile');
    }

    setIsSubmitting(true);
    let resumeUrl = '';

    try {
      // Step 1: Upload resume to applications bucket
      setUploadProgress('Uploading resume...');
      resumeUrl = await uploadFile(resumeFile, 'applications', 'resumes/');

      // Step 2: Create application record
      setUploadProgress('Submitting application...');
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          candidate_id: profile.id,
          status: 'applied',
          cover_letter: coverLetter || null,
        })
        .select()
        .single();

      // Improved duplicate application error handling (robust for different error shapes)
      if (applicationError) {
        const errorText = (
          applicationError?.message ||
          applicationError?.details ||
          applicationError?.toString()
        )?.toLowerCase();

        if (
          errorText &&
          errorText.includes('duplicate key value') &&
          errorText.includes('idx_applications_job_candidate')
        ) {
          toast.error('Already Applied');
          setUploadProgress('');
          setIsSubmitting(false);
          return null;
        }
        throw applicationError;
      }

      // Step 3: Update candidate's latest resume URL if different
      if (resumeUrl && profile.resume_url !== resumeUrl) {
        await supabase
          .from('candidates')
          .update({ resume_url: resumeUrl })
          .eq('id', profile.id);
      }

      setUploadProgress('');
      toast.success('Application submitted successfully!');
      return application;

    } catch (error: any) {
      console.error('Error submitting application:', error);
      // Extra bulletproof check for duplicate error in catch block
      const errorText =
        (error?.message || error?.details || error?.toString()).toLowerCase();
      if (
        errorText.includes('duplicate key value') &&
        errorText.includes('idx_applications_job_candidate')
      ) {
        toast.error('Already Applied');
        return null;
      }
      toast.error(`Failed to submit application: ${error.message || error.toString()}`);
      throw error;
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const withdrawApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application withdrawn successfully');
    } catch (error: any) {
      console.error('Error withdrawing application:', error);
      toast.error(`Failed to withdraw application: ${error.message}`);
      throw error;
    }
  };

  const getApplicationsByCandidate = async () => {
    if (!profile) return [];

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs (
            id,
            title,
            location,
            experience_level,
            recruiter:recruiters (
              company_name
            )
          )
        `)
        .eq('candidate_id', profile.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
      return [];
    }
  };

  const getApplicationsByJob = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:candidates (
            id,
            name,
            phone,
            resume_url,
            skills,
            location,
            education,
            experience
          )
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job applications:', error);
      toast.error('Failed to load applications');
      return [];
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: 'applied' | 'under_review' | 'rejected' | 'hired'
  ) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Application status updated to ${status}`);
      return data;
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
      throw error;
    }
  };

  return {
    isSubmitting,
    uploadProgress,
    submitApplication,
    withdrawApplication,
    getApplicationsByCandidate,
    getApplicationsByJob,
    updateApplicationStatus,
  };
};