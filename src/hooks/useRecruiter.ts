import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RecruiterProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry?: string;
  description?: string;
  location?: string;
  logo_url?: string;
}

export const useRecruiter = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('recruiters')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching recruiter profile:', error);
        if (error.code === 'PGRST116') {
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching recruiter profile:', error);
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('recruiters')
        .insert({
          user_id: user?.id,
          company_name: 'New Company'
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      toast.success('Company profile created successfully');
    } catch (error) {
      console.error('Error creating recruiter profile:', error);
      toast.error('Failed to create company profile');
    }
  };

  const updateProfile = async (updates: Partial<RecruiterProfile>) => {
    try {
      console.log('Updating recruiter profile with:', updates);
      
      const { data, error } = await supabase
        .from('recruiters')
        .update(updates)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Recruiter profile updated successfully:', data);
      setProfile(data);
      toast.success('Company profile updated successfully');
    } catch (error) {
      console.error('Error updating recruiter profile:', error);
      toast.error(`Failed to update company profile: ${error.message}`);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName, 'to bucket:', bucket);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  const createJob = async (jobData: any) => {
    if (!profile) {
      toast.error('Recruiter profile not found. Please complete your profile first.');
      return;
    }
    
    try {
      const jobToInsert = {
        ...jobData,
        recruiter_id: profile.id,
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobToInsert)
        .select()
        .single();

      if (error) throw error;

      toast.success('Job posted successfully!');
      return data;
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(`Failed to post job: ${error.message}`);
    }
  };
  
  // Function to determine if job is closed based on application_deadline
  const isJobClosed = (applicationDeadline: string | null) => {
    if (!applicationDeadline) return false; // No deadline means always active
    
    const deadline = new Date(applicationDeadline);
    deadline.setHours(23, 59, 59, 999); // Set to end of day
    const now = new Date();
    
    return now > deadline;
  };

  // Fetch aggregated stats with dynamic closed jobs count
  const fetchRecruiterStats = async () => {
    if (!profile?.id) return null;

    try {
      console.log('Fetching recruiter stats for profile:', profile.id);

      // Fetch all jobs posted by this recruiter with application_deadline
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, created_at, application_deadline, applications(id, status)')
        .eq('recruiter_id', profile.id)
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        throw jobsError;
      }

      console.log('Fetched jobs data:', jobsData);

      let totalApplications = 0;
      let activeJobs = 0;
      let closedJobs = 0;
      let totalApplicationsReviewed = 0;

      jobsData.forEach(job => {
        // Determine if job is closed based on application_deadline
        const jobClosed = isJobClosed(job.application_deadline);

        if (jobClosed) {
          closedJobs++;
        } else {
          activeJobs++;
        }
        
        // Count total and reviewed applications
        totalApplications += job.applications.length;
        job.applications.forEach(app => {
          if (app.status === 'under_review' || app.status === 'hired' || app.status === 'rejected' || app.status === 'interview_scheduled') {
            totalApplicationsReviewed++;
          }
        });
      });

      console.log('Calculated stats:', {
        totalJobs: jobsData.length,
        activeJobs,
        closedJobs,
        totalApplications,
        totalApplicationsReviewed
      });

      // Get recent jobs with their status
      const recentJobs = jobsData.slice(0, 5).map(job => ({
        id: job.id,
        title: job.title,
        applications: job.applications.length,
        postedAt: new Date(job.created_at).toLocaleDateString(),
        status: isJobClosed(job.application_deadline) ? 'closed' : 'active'
      }));

      return {
        totalJobs: jobsData.length,
        activeJobs: activeJobs,
        closedJobs: closedJobs,
        totalApplications: totalApplications,
        reviewedApplications: totalApplicationsReviewed,
        recentJobs: recentJobs
      };
    } catch (error) {
      console.error('Error fetching recruiter stats:', error);
      toast.error('Failed to load statistics');
      return null;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    uploadFile,
    createJob,
    fetchRecruiterStats,
    refetch: fetchProfile
  };
};