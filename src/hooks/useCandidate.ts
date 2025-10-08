import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CandidateProfile {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  location?: string;
  education?: string;
  experience?: string;
  skills: string[];
  resume_url?: string;
  license_type?: string;
  license_number?: string;
}

// -------------------------------------------------------------------
// 💡 SIMULATED RESUME PARSER (In a real app, this would be an API call)
// This function simulates fetching extracted data from a resume analyzer.
// -------------------------------------------------------------------
const simulateResumeAnalysis = (file: File) => {
  // In a real application, you would use fetch() here to call your API/Edge Function.
  // The API would read the file's content from the bucket URL and return structured data.
  
  const extractedName = file.name.replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean).slice(0, 2).join(' ');
  const randomPhone = `+1-555-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    name: extractedName || 'Candidate Name',
    phone: randomPhone,
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'SQL', 'Project Management'],
    experience: "1. Senior Developer at Acme Corp (2020-Present)\n2. Junior Dev at Startup XYZ (2018-2020)",
  };
};
// -------------------------------------------------------------------


export const useCandidate = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        if (error.code === 'PGRST116') {
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          user_id: user?.id,
          name: user?.email || 'New User',
          skills: []
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      toast.success('Profile created successfully');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const updateProfile = async (updates: Partial<CandidateProfile>) => {
    try {
      console.log('Updating profile with:', updates);
      
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Profile updated successfully:', data);
      setProfile(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // We will now handle resume parsing logic inside the upload process
      
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
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  /**
   * Handles resume upload, analysis, and autofilling profile fields.
   * This is the dedicated function called from CandidateProfile.tsx.
   */
  const uploadAndAutofillResume = async (file: File) => {
    try {
      // 1. Upload the file (using the existing, reliable uploadFile function)
      const resumeUrl = await uploadFile(file, 'resumes', 'profiles/');

      // 2. Simulate analysis and get extracted data
      // NOTE: In a real app, this function would call an external API/Edge Function.
      const extractedData = simulateResumeAnalysis(file);

      // 3. Update the database profile with the new URL and extracted data
      const updates = {
        resume_url: resumeUrl,
        name: extractedData.name, // Autofill name
        phone: extractedData.phone, // Autofill phone
        skills: [...new Set([...(profile?.skills || []), ...extractedData.skills])], // Merge skills
        experience: extractedData.experience, // Autofill experience
      };
      
      await updateProfile(updates);

      toast.success('Resume uploaded and profile auto-filled!');
      return resumeUrl;
    } catch (error) {
      console.error('Autofill error:', error);
      toast.error('Failed to process resume for autofill.');
      throw error;
    }
  };

  // --- NEW FUNCTION: Fetch candidate statistics ---
  const fetchCandidateStats = async () => {
    if (!profile?.id) return null;

    try {
      // 1. Fetch all applications for this candidate
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id, 
          status, 
          applied_at,
          job:jobs (
            id,
            title,
            recruiter:recruiters (
              company_name
            )
          )
        `)
        .eq('candidate_id', profile.id)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      // 2. Count applications by status
      const totalApplications = applicationsData?.length || 0;
      const interviewsScheduled = applicationsData?.filter(
        app => app.status === 'interview_scheduled'
      ).length || 0;

      // 3. Get job alerts (matching jobs based on candidate skills)
      const candidateSkills = profile.skills || [];
      let jobAlerts = 0;
      
      if (candidateSkills.length > 0) {
        const { count, error: jobsError } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .overlaps('requirements', candidateSkills);

        if (!jobsError) {
          jobAlerts = count || 0;
        }
      }

      // 4. Format recent applications (last 5)
      const recentApplications = applicationsData?.slice(0, 5).map(app => ({
        id: app.id,
        jobTitle: app.job?.title || 'Unknown Position',
        company: app.job?.recruiter?.company_name || 'Unknown Company',
        status: app.status,
        appliedAt: new Date(app.applied_at).toLocaleDateString(),
      })) || [];

      return {
        totalApplications,
        profileViews: 0, // TODO: Implement profile views tracking
        interviewsScheduled,
        jobAlerts,
        recentApplications
      };
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
      return null;
    }
  };
  // --- END NEW FUNCTION ---

  return {
    profile,
    loading,
    updateProfile,
    uploadFile,
    uploadAndAutofillResume,
    fetchCandidateStats, // Expose the new stats fetcher
    refetch: fetchProfile
  };
};