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
  email: string;
  experience?: string;
  skills: string[];
  resume_url?: string;
  license_type?: string;
  license_number?: string;
}

export const useCandidate = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
    // eslint-disable-next-line
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
      } else if (data && typeof data === "object") {
        // Option 2: If email is missing, update it in Supabase
        if (!data.email || data.email === '') {
          // Update candidate with email from auth
          const updateEmail = user?.email || '';
          const { error: updateError } = await supabase
            .from('candidates')
            .update({ email: updateEmail })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating candidate email:', updateError);
          }
          // Set email in local object too
          data.email = updateEmail;
        }
        setProfile({
          ...data,
          email: data.email ?? (user?.email || 'No Email Provided'),
        });
      } else {
        setProfile(null);
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
          email: user?.email || 'No Email Provided',
          skills: []
        })
        .select()
        .single();

      if (error) throw error;
      if (data && typeof data === "object") {
        setProfile({
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          phone: data.phone,
          location: data.location,
          education: data.education,
          email: data.email ?? (user?.email || 'No Email Provided'),
          experience: data.experience,
          skills: data.skills,
          resume_url: data.resume_url,
          license_type: data.license_type,
          license_number: data.license_number,
        });
      } else {
        setProfile(null);
      }
      toast.success('Profile created successfully');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const updateProfile = async (updates: Partial<CandidateProfile>) => {
    try {
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

      if (data && typeof data === "object") {
        setProfile({
          ...data,
          email: data.email ?? (user?.email || 'No Email Provided'),
        });
      } else {
        setProfile(null);
      }
      toast.success('Profile updated successfully');
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    try {
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`;

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

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  /**
   * Uploads resume, sends base64 to Edge Function, and autofills profile fields.
   * Edge Function expects: resumeBase64, mimeType, candidateId
   */
  const uploadAndAutofillResume = async (file: File) => {
    try {
      // 1. Upload the file to Supabase storage
      const resumeUrl = await uploadFile(file, 'Resumes', 'profiles/');

      // 2. Read the file as base64 (without the data:...prefix)
      const base64Resume: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 3. Get candidate row id from Supabase (not user_id!)
      const candidateId = profile?.id;

      // 4. POST to Edge Function with required fields
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: {
          resumeBase64: base64Resume,
          mimeType: file.type,
          candidateId,
        }
      });

      if (parseError || !parsedData) {
        throw parseError || new Error('Resume parsing failed');
      }

      // 5. Update profile in Supabase with parsed data
      const updates: Partial<CandidateProfile> = {
        resume_url: resumeUrl,
        name: parsedData.name,
        phone: parsedData.phone,
        location: parsedData.location,
        skills: parsedData.skills,
        education: parsedData.education,
        experience: parsedData.experience,
        license_type: parsedData.license_type,
        license_number: parsedData.license_number,
      };

      await updateProfile(updates);

      toast.success('Resume uploaded and profile auto-filled!');
      return parsedData;
    } catch (error) {
      toast.error('Failed to process resume for autofill.');
      throw error;
    }
  };

  // --- Candidate statistics ---
  const fetchCandidateStats = async () => {
    if (!profile?.id) return null;

    try {
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

      const totalApplications = applicationsData?.length || 0;
      const interviewsScheduled = applicationsData?.filter(
        app => app.status === 'interview_scheduled'
      ).length || 0;

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

      const recentApplications = applicationsData?.slice(0, 5).map(app => ({
        id: app.id,
        jobTitle: app.job?.title || 'Unknown Position',
        company: app.job?.recruiter?.company_name || 'Unknown Company',
        status: app.status,
        appliedAt: new Date(app.applied_at).toLocaleDateString(),
      })) || [];

      return {
        totalApplications,
        profileViews: 0,
        interviewsScheduled,
        jobAlerts,
        recentApplications
      };
    } catch (error) {
      return null;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    uploadFile,
    uploadAndAutofillResume,
    fetchCandidateStats,
    refetch: fetchProfile
  };
};