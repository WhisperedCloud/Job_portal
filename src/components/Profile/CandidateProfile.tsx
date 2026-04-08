import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import {
  User, MapPin, GraduationCap, Briefcase, Award, FileText,
  Mail, CheckCircle2, XCircle, Sparkles, Link, TrendingUp, AlertCircle
} from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidate';
import { FileUpload } from '../ui/file-upload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const availableSkills = [
  'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java',
  'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'HTML', 'CSS', 'SASS', 'LESS',
  'Bootstrap', 'Tailwind CSS', 'jQuery', 'Express.js', 'Next.js', 'Nuxt.js', 'Svelte',
  'Django', 'Flask', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET', 'MongoDB',
  'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch', 'Firebase', 'AWS', 'Azure',
  'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub', 'GitLab', 'Jira',
  'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'UI/UX Design', 'Graphic Design',
  'Project Management', 'Agile', 'Scrum', 'Digital Marketing', 'SEO', 'Content Writing',
  'Data Analysis', 'Machine Learning', 'Artificial Intelligence', 'DevOps', 'Cybersecurity',
  'Mobile Development', 'iOS Development', 'Android Development', 'React Native', 'Flutter',
];

const CandidateProfile = () => {
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadAndAutofillResume, refetch } = useCandidate();
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [personalDetails, setPersonalDetails] = useState({ name: '', phone: '', email: '' });
  const [locationData, setLocationData] = useState('');
  const [educationData, setEducationData] = useState('');
  const [experienceData, setExperienceData] = useState('');
  const [licenseData, setLicenseData] = useState({ type: '', number: '' });
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');

  // ── Populate form from loaded profile ──────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setPersonalDetails({
        name: profile.name || '',
        phone: profile.phone || '',
        email: user?.email || '',
      });
      setLocationData(profile.location || '');
      setEducationData(profile.education || '');
      setExperienceData(profile.experience || '');
      setLicenseData({ type: profile.license_type || '', number: profile.license_number || '' });
      // profile.skills is already normalized to string[] by useCandidate
      setSelectedSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setLinkedinUrl(profile.linkedin_url || '');
    }
  }, [profile, user]);

  // ── Profile completeness check ─────────────────────────────────────────────
  const missingFields: string[] = [];
  if (!personalDetails.name) missingFields.push('Full name');
  if (selectedSkills.length === 0) missingFields.push('At least one skill (required for AI matching)');
  if (!experienceData) missingFields.push('Work experience');
  if (!educationData) missingFields.push('Education');
  const isProfileIncomplete = missingFields.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleResumeUpload = async (file: File) => {
    try {
      setIsUploading(true);
      if (!file) return;
      const autofilled = await uploadAndAutofillResume(file);
      if (autofilled) {
        if (autofilled.name) setPersonalDetails((d) => ({ ...d, name: autofilled.name }));
        if (autofilled.phone) setPersonalDetails((d) => ({ ...d, phone: autofilled.phone }));
        if (autofilled.location) setLocationData(autofilled.location);
        if (autofilled.skills) {
          const normalized = Array.isArray(autofilled.skills)
            ? autofilled.skills
            : String(autofilled.skills).split(',').map((s: string) => s.trim()).filter(Boolean);
          setSelectedSkills(normalized);
        }
        if (autofilled.education) setEducationData(autofilled.education);
        if (autofilled.experience) setExperienceData(autofilled.experience);
        if (autofilled.license_type) setLicenseData((l) => ({ ...l, type: autofilled.license_type }));
        if (autofilled.license_number) setLicenseData((l) => ({ ...l, number: autofilled.license_number }));
        toast.success('Profile autofilled from resume! Review and save each section.');
      }
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      if (error.message?.includes('Quota Exceeded')) {
        toast.error('AI Quota Limit Reached', {
          description: 'The AI service is busy. Please try again in a few minutes or manually fill your profile.',
          duration: 6000,
        });
      } else {
        toast.error('Resume parsing failed', {
          description: error.message || 'Could not autofill profile from resume.',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleJobSeekingToggle = async (checked: boolean) => {
    setIsLookingForJob(checked);
    toast.success(checked ? 'You are now open to opportunities!' : 'Job seeking status updated');
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Saves skills to DB — important that this is always called after any skill change
  const handleSaveSkills = async () => {
    if (selectedSkills.length === 0) {
      toast.warning('Please select at least one skill before saving.');
      return;
    }
    try {
      await updateProfile({ skills: selectedSkills });
    } catch (error) {
      console.error('Error saving skills:', error);
    }
  };

  const handleUpdatePersonalDetails = async () => {
    if (!personalDetails.name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    await updateProfile({ name: personalDetails.name, phone: personalDetails.phone });
  };

  const handleUpdateLocation = async () => updateProfile({ location: locationData });
  const handleUpdateEducation = async () => updateProfile({ education: educationData });
  const handleUpdateExperience = async () => updateProfile({ experience: experienceData });
  const handleUpdateLicense = async () =>
    updateProfile({ license_type: licenseData.type, license_number: licenseData.number });

  const handleSaveLinkedinUrl = async () => {
    if (!linkedinUrl.trim()) {
      toast.error('Please enter your LinkedIn profile URL first.');
      return;
    }
    await updateProfile({ linkedin_url: linkedinUrl.trim() });
  };

  const handleEnrichProfile = async () => {
    if (!linkedinUrl) {
      toast.error('Please enter your LinkedIn profile URL first.');
      return;
    }
    if (!profile?.id) return;
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-profile', {
        body: { candidateId: profile.id, linkedinUrl },
      });
      if (error) throw error;
      toast.success('Profile enriched successfully!');
      await refetch();
    } catch (err: any) {
      toast.error('Enrichment failed: ' + err.message);
    } finally {
      setIsEnriching(false);
    }
  };

  const filteredSkills = availableSkills.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-2">Update your details below</p>
      </div>

      {/* ── Profile Completeness Warning ───────────────────────────────────── */}
      {isProfileIncomplete && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Complete your profile for accurate AI job matching.</strong>
            <p className="mt-1 text-amber-700">The following sections are missing:</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Job Seeking Status ─────────────────────────────────────────────── */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isLookingForJob ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-gray-400" />
                )}
                <h3 className="text-lg font-semibold">Job Seeking Status</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLookingForJob
                  ? 'You are currently open to new job opportunities. Recruiters can see your profile.'
                  : 'You are not looking for jobs right now. Your profile is hidden from recruiters.'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-6">
              <Label
                htmlFor="job-seeking-toggle"
                className={`text-sm font-medium ${!isLookingForJob ? 'text-muted-foreground' : ''}`}
              >
                {isLookingForJob ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="job-seeking-toggle"
                checked={isLookingForJob}
                onCheckedChange={handleJobSeekingToggle}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
          {isLookingForJob ? (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✨ Great! Your profile is visible to recruiters and you'll receive job recommendations.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                💼 Your profile is currently hidden. Toggle on when you're ready to explore new opportunities.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Personal Information ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your basic contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={personalDetails.name}
                onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={personalDetails.phone}
                onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={personalDetails.email}
              readOnly
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>
          <Button onClick={handleUpdatePersonalDetails}>Save Personal Information</Button>
        </CardContent>
      </Card>

      {/* ── Location ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>Where are you based?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={locationData}
            onChange={(e) => setLocationData(e.target.value)}
            placeholder="e.g. San Francisco, CA"
          />
          <Button onClick={handleUpdateLocation}>Save Location</Button>
        </CardContent>
      </Card>

      {/* ── Resume Upload ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume
          </CardTitle>
          <CardDescription>Upload your latest resume (PDF, DOC, DOCX – Max 5MB)</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileSelect={handleResumeUpload}
            accept=".pdf"
            maxSize={5}
            uploadType="resume"
            currentFileUrl={profile?.resume_url}
            isUploading={isUploading}
          />
          {profile?.resume_url && (
            <p className="text-xs text-green-600 mt-2">✓ Resume uploaded successfully</p>
          )}
        </CardContent>
      </Card>

      {/* ── LinkedIn / AI Enrichment ──────────────────────────────────────── */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Sparkles className="h-5 w-5" />
            AI Profile Enrichment
          </CardTitle>
          <CardDescription>
            Add your LinkedIn URL to auto-enrich your profile with seniority, domain expertise, and
            career trajectory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI insights display — only shown when enrichment data exists */}
          {(profile?.seniority_level ||
            profile?.career_trajectory ||
            profile?.linkedin_summary ||
            profile?.projects ||
            (profile?.domain_expertise || []).length > 0) && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm mb-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <h4 className="font-bold text-indigo-900 uppercase tracking-tight">
                    AI Generated Insights
                  </h4>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-indigo-100/50 text-indigo-700 border-indigo-200"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">
                      Experience Level
                    </span>
                    <div className="flex items-center gap-2 bg-white/80 p-3 rounded-lg border border-indigo-50 shadow-sm">
                      <Award className="h-4 w-4 text-indigo-500" />
                      <span className="font-bold text-indigo-900">
                        {profile?.seniority_level || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">
                      Domain Focus
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(profile?.domain_expertise || []).map((domain, i) => (
                        <Badge
                          key={i}
                          className="bg-indigo-600/10 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors"
                        >
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {profile?.linkedin_summary && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">
                      Professional Summary
                    </span>
                    <div className="bg-white/80 p-4 rounded-lg border border-indigo-50 shadow-sm relative overflow-hidden text-indigo-900/80 text-sm leading-relaxed">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                      {profile.linkedin_summary}
                    </div>
                  </div>
                )}

                {profile?.projects && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">
                      Key Projects
                    </span>
                    <div className="bg-white/80 p-4 rounded-lg border border-indigo-50 shadow-sm relative overflow-hidden text-indigo-900/80 text-sm leading-relaxed whitespace-pre-wrap">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      {profile.projects}
                    </div>
                  </div>
                )}

                {profile?.career_trajectory && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">
                      Trajectory Analysis
                    </span>
                    <div className="bg-white/80 p-4 rounded-lg border border-indigo-50 shadow-sm relative overflow-hidden italic text-indigo-900/80 text-sm leading-relaxed">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                      "{profile.career_trajectory}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="linkedin_url" className="flex items-center gap-1 mb-1">
                <Link className="h-4 w-4" /> LinkedIn Profile URL
              </Label>
              <Input
                id="linkedin_url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-profile"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleSaveLinkedinUrl}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Save URL
              </Button>
            </div>
          </div>
          <Button
            onClick={handleEnrichProfile}
            disabled={isEnriching}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isEnriching ? 'Enriching...' : 'Enrich Profile with AI'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Skills
          </CardTitle>
          <CardDescription>
            Select your technical and professional skills.{' '}
            <span className="text-amber-600 font-medium">
              Required for AI job matching — click "Save Skills" after selecting.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected skills chips */}
          {selectedSkills.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">
                Selected Skills ({selectedSkills.length})
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                {selectedSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 hover:text-red-500"
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skill search */}
          <div>
            <Input
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="mb-3"
            />
          </div>

          {/* Skills checkbox grid */}
          <div>
            <Label className="mb-3 block">Available Skills (Select Multiple)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 border rounded-md">
              {filteredSkills.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={skill}
                    checked={selectedSkills.includes(skill)}
                    onCheckedChange={() => handleSkillToggle(skill)}
                  />
                  <label
                    htmlFor={skill}
                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {skill}
                  </label>
                </div>
              ))}
              {filteredSkills.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-3 text-center py-4">
                  No skills match your search.
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveSkills}
            className="w-full"
            variant={selectedSkills.length === 0 ? 'outline' : 'default'}
          >
            Save Skills ({selectedSkills.length} selected)
          </Button>
        </CardContent>
      </Card>

      {/* ── Education ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education
          </CardTitle>
          <CardDescription>Your educational background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={educationData}
            onChange={(e) => setEducationData(e.target.value)}
            placeholder="e.g. Bachelor's in Computer Science, Stanford University (2018–2022)"
            rows={4}
          />
          <Button onClick={handleUpdateEducation}>Save Education</Button>
        </CardContent>
      </Card>

      {/* ── Work Experience ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Work Experience
          </CardTitle>
          <CardDescription>Your professional experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={experienceData}
            onChange={(e) => setExperienceData(e.target.value)}
            placeholder={
              'e.g. Software Engineer at Google (2022–Present)\n• Developed web applications\n• Led team of 5 developers'
            }
            rows={6}
          />
          <Button onClick={handleUpdateExperience}>Save Experience</Button>
        </CardContent>
      </Card>

      {/* ── Professional License ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Professional License</CardTitle>
          <CardDescription>Add any professional certifications or licenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_type">License Type</Label>
              <Input
                id="license_type"
                value={licenseData.type}
                onChange={(e) => setLicenseData({ ...licenseData, type: e.target.value })}
                placeholder="e.g. AWS Certified Developer"
              />
            </div>
            <div>
              <Label htmlFor="license_number">License Number</Label>
              <Input
                id="license_number"
                value={licenseData.number}
                onChange={(e) => setLicenseData({ ...licenseData, number: e.target.value })}
                placeholder="e.g. ABC123456"
              />
            </div>
          </div>
          <Button onClick={handleUpdateLicense}>Save License Information</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateProfile;