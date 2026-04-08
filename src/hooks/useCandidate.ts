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
  linkedin_url?: string;
  seniority_level?: string;
  domain_expertise?: string[];
  career_trajectory?: string;
  linkedin_summary?: string;
  projects?: string;
  resume_text?: string;
}

// ─── Helper: normalize any DB value into a clean string[] ───────────────────
const normalizeArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Handle JSON-encoded array: '["React","Node.js"]'
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch { }
    }
    // Handle comma-separated string: "React, Node.js, Python"
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// ─── Helper: map raw DB row → CandidateProfile ──────────────────────────────
const mapRowToProfile = (data: any, fallbackEmail: string): CandidateProfile => ({
  id: data.id,
  user_id: data.user_id,
  name: data.name || '',
  phone: data.phone || '',
  location: data.location || '',
  education: data.education || '',
  email: data.email || fallbackEmail,
  experience: data.experience || '',
  skills: normalizeArray(data.skills),
  resume_url: data.resume_url || '',
  license_type: data.license_type || '',
  license_number: data.license_number || '',
  linkedin_url: data.linkedin_url || '',
  seniority_level: data.seniority_level || '',
  domain_expertise: normalizeArray(data.domain_expertise),
  career_trajectory: data.career_trajectory || '',
  linkedin_summary: data.linkedin_summary || '',
  projects: data.projects || '',
  resume_text: data.resume_text || '',
});

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

  // ── Fetch existing profile ──────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          await createProfile();
        } else {
          throw error;
        }
        return;
      }

      if (data && typeof data === 'object') {
        // Back-fill email if missing
        if (!data.email || data.email === '') {
          const newEmail = user?.email || '';
          await supabase.from('candidates').update({ email: newEmail }).eq('id', data.id);
          data.email = newEmail;
        }
        setProfile(mapRowToProfile(data, user?.email || ''));
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

  // ── Create profile for first-time users ────────────────────────────────────
  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          user_id: user?.id,
          name: user?.email || 'New User',
          email: user?.email || '',
          skills: [],
          domain_expertise: [],
        })
        .select()
        .single();

      if (error) throw error;

      if (data && typeof data === 'object') {
        setProfile(mapRowToProfile(data, user?.email || ''));
        toast.success('Profile created! Please fill in your skills and experience for accurate AI matching.');
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  // ── Update profile fields ───────────────────────────────────────────────────
  const updateProfile = async (updates: Partial<CandidateProfile>) => {
    try {
      // Normalize any array fields before sending to DB
      const safeUpdates: any = { ...updates };
      if ('skills' in safeUpdates) safeUpdates.skills = normalizeArray(safeUpdates.skills);
      if ('domain_expertise' in safeUpdates) safeUpdates.domain_expertise = normalizeArray(safeUpdates.domain_expertise);

      const { data, error } = await supabase
        .from('candidates')
        .update(safeUpdates)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      if (data && typeof data === 'object') {
        setProfile(mapRowToProfile(data, user?.email || ''));
      }

      toast.success('Profile updated successfully');
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  };

  // ── Upload file to Supabase Storage ────────────────────────────────────────
  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    try {
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  // ── Upload resume → parse via Edge Function → autofill profile ─────────────
  const uploadAndAutofillResume = async (file: File) => {
    try {
      // 1. Upload file to storage
      const resumeUrl = await uploadFile(file, 'Resumes', 'profiles/');

      // 2. Read file as base64 and sanitize
      const cleanBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (!result.includes(',')) {
            reject(new Error("Invalid file encoding"));
            return;
          }

          // 🛡️ Remove data URL prefix (e.g. "data:application/pdf;base64,")
          const parts = result.split(',');
          if (parts.length < 2) {
            reject(new Error("Invalid file encoding"));
            return;
          }

          const base64 = parts[1].trim();

          // 🛡️ Remove any whitespace or newlines that trip up the Gemini API
          const sanitized = base64.replace(/\s/g, '');

          // 🛡️ Enforce 2MB limit for AI processing efficiency
          if (sanitized.length > 1_500_000) { // ~2MB original file size (base64 is ~33% larger)
            reject(new Error("File too large. Please use a resume under 2MB."));
            return;
          }

          resolve(sanitized);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 3. Call Edge Function with proper auth
      const candidateId = profile?.id;

      console.log("Calling parse-resume...");


      const functionName = 'parse-resume';
      
      console.log(`🧠 [AI] Invoking ${functionName}...`);

      const { data: parsedData, error: functionError } = await supabase.functions.invoke(functionName, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: {
          resumeBase64: cleanBase64,
          mimeType: file.type || "application/pdf",
          candidateId,
        },
      });
      
      if (functionError) {
        console.error("❌ Function Error Details:", functionError);
        
        // Handle Gemini 429 specifically if caught by Supabase
        if (functionError.message?.includes('429') || functionError.status === 429) {
          throw new Error("AI Quota Exceeded: Your daily limit has been reached. Please try again soon.");
        }
        
        // Handle 401 specifically
        if (functionError.status === 401) {
          throw new Error("Authorization Error: Please ensure your account is logged in correctly.");
        }

        throw new Error(functionError.message || "Resume parsing failed");
      }
      // ✅ CHECK DATA
      if (!parsedData) {
        throw new Error("AI parsing returned no data");
      }

      console.log("✅ Resume parsed successfully:", parsedData);
      // 4. Update the candidate profile directly from the frontend
      // We use a defensive mapping in case some columns (resume_text, etc) are still missing
      if (candidateId) {
        console.log("Persisting AI insights to candidate profile...");

        const updateData: any = {
          name: parsedData.name || undefined,
          phone: parsedData.phone || undefined,
          location: parsedData.location || undefined,
          experience: parsedData.experience || undefined,
          education: parsedData.education || undefined,
          linkedin_url: parsedData.linkedin_url || undefined,
          seniority_level: parsedData.seniority_level || undefined,
          domain_expertise: parsedData.domain_expertise || undefined,
          career_trajectory: parsedData.career_trajectory || undefined,
          resume_url: resumeUrl,
        };

        // These columns require the SQL migration to exist
        if (parsedData.projects) updateData.projects = parsedData.projects;
        if (parsedData.linkedin_summary) updateData.linkedin_summary = parsedData.linkedin_summary;
        if (parsedData.resume_text) updateData.resume_text = parsedData.resume_text;

        // Merge skills if present
        if (parsedData.skills && parsedData.skills.length > 0) {
          const { data: existingProfile } = await supabase
            .from('candidates')
            .select('skills')
            .eq('id', candidateId)
            .single();

          const existingSkills = existingProfile?.skills || [];
          const parsedSkills = Array.isArray(parsedData.skills)
            ? parsedData.skills
            : String(parsedData.skills).split(',').map((s: string) => s.trim()).filter(Boolean);

          updateData.skills = [...new Set([...existingSkills, ...parsedSkills])];
        }

        const { error: updateError } = await supabase
          .from('candidates')
          .update(updateData)
          .eq('id', candidateId);

        if (updateError) {
          console.error("❌ Failed to save parsed profile to DB:", updateError);
          toast.error("Resume parsed, but failed to save to profile automatically.");
        } else {
          console.log("✅ Profile updated successfully with AI insights.");
        }
      }

      // 5. Return normalized data for UI autofill
      return {
        name: parsedData.name,
        phone: parsedData.phone,
        location: parsedData.location,
        skills: parsedData.skills,
        education: parsedData.education,
        experience: parsedData.experience,
        license_type: parsedData.license_type,
        license_number: parsedData.license_number,
      };

    } catch (error) {
      toast.error('Failed to process resume for autofill.');
      throw error;
    }
  };

  // ── Candidate statistics ────────────────────────────────────────────────────
  const fetchCandidateStats = async () => {
    if (!profile?.id) return null;

    try {
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          job:applications_job_id_fkey (
            id,
            title,
            recruiter:jobs_recruiter_id_fkey (
              company_name
            )
          )
        `)
        .eq('candidate_id', profile.id)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      const totalApplications = applicationsData?.length || 0;
      const interviewsScheduled =
        applicationsData?.filter((app) => app.status === 'interview_scheduled').length || 0;

      const candidateSkills = profile.skills || [];
      let jobAlerts = 0;

      if (candidateSkills.length > 0) {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .overlaps('requirements', candidateSkills);
        jobAlerts = count || 0;
      }

      const recentApplications =
        applicationsData?.slice(0, 5).map((app) => ({
          id: app.id,
          jobTitle: (app.job as any)?.title || 'Unknown Position',
          company: (app.job as any)?.recruiter?.company_name || 'Unknown Company',
          status: app.status,
          appliedAt: new Date(app.applied_at).toLocaleDateString(),
        })) || [];

      return { totalApplications, profileViews: 0, interviewsScheduled, jobAlerts, recentApplications };
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
    refetch: fetchProfile,
  };
};