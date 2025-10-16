import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { User, MapPin, GraduationCap, Briefcase, Award, FileText, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidate';
import { FileUpload } from '../ui/file-upload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  'Mobile Development', 'iOS Development', 'Android Development', 'React Native', 'Flutter'
 ]; 

const CandidateProfile = () => {
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadAndAutofillResume } = useCandidate();
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Autofillable state
  const [personalDetails, setPersonalDetails] = useState({ name: '', phone: '', email: '' });
  const [locationData, setLocationData] = useState('');
  const [educationData, setEducationData] = useState('');
  const [experienceData, setExperienceData] = useState('');
  const [licenseData, setLicenseData] = useState({ type: '', number: '' });

  useEffect(() => {
    if (profile) {
      setPersonalDetails({ 
        name: profile.name || '', 
        phone: profile.phone || '',
        email: user?.email || '' 
      });
      setLocationData(profile.location || '');
      setEducationData(profile.education || '');
      setExperienceData(profile.experience || '');
      setLicenseData({ type: profile.license_type || '', number: profile.license_number || '' });
      setSelectedSkills(profile.skills || []);
      // setIsLookingForJob(profile.is_looking_for_job ?? true);
    }
  }, [profile, user]);

  // Autofill all form fields from resume analysis result
  const handleResumeUpload = async (file: File) => {
    try {
      setIsUploading(true);
      if (!file) return;

      const autofilled = await uploadAndAutofillResume(file);

      if (autofilled) {
        if (autofilled.name) setPersonalDetails(details => ({ ...details, name: autofilled.name }));
        if (autofilled.phone) setPersonalDetails(details => ({ ...details, phone: autofilled.phone }));
        if (autofilled.location) setLocationData(autofilled.location);
        if (autofilled.skills) setSelectedSkills(autofilled.skills);
        if (autofilled.education) setEducationData(autofilled.education);
        if (autofilled.experience) setExperienceData(autofilled.experience);
        if (autofilled.license_type) setLicenseData(lic => ({ ...lic, type: autofilled.license_type }));
        if (autofilled.license_number) setLicenseData(lic => ({ ...lic, number: autofilled.license_number }));
        toast.success("Profile autofilled from resume!");
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error("Could not autofill profile from resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleJobSeekingToggle = async (checked: boolean) => {
    setIsLookingForJob(checked);
    try {
      // Update profile with job seeking status
      // await updateProfile({ is_looking_for_job: checked });
      toast.success(checked ? 'You are now open to opportunities!' : 'Job seeking status updated');
    } catch (error) {
      console.error('Error updating job seeking status:', error);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  const handleSaveSkills = async () => {
    try {
      await updateProfile({ skills: selectedSkills });
    } catch (error) {
      console.error('Error saving skills:', error);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  const handleUpdatePersonalDetails = async () =>
    updateProfile({ name: personalDetails.name, phone: personalDetails.phone });

  const handleUpdateLocation = async () => updateProfile({ location: locationData });
  const handleUpdateEducation = async () => updateProfile({ education: educationData });
  const handleUpdateExperience = async () => updateProfile({ experience: experienceData });
  const handleUpdateLicense = async () =>
    updateProfile({ license_type: licenseData.type, license_number: licenseData.number });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
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

      {/* Job Seeking Status with Toggle */}
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
          {isLookingForJob && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✨ Great! Your profile is visible to recruiters and you'll receive job recommendations.
              </p>
            </div>
          )}
          {!isLookingForJob && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                💼 Your profile is currently hidden. Toggle on when you're ready to explore new opportunities.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
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
          
          {/* Email Field - Read Only */}
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

          <Button onClick={handleUpdatePersonalDetails}>
            Save Personal Information
          </Button>
        </CardContent>
      </Card>

      {/* Location */}
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

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume
          </CardTitle>
          <CardDescription>Upload your latest resume (PDF, DOC, DOCX - Max 5MB)</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileSelect={handleResumeUpload}
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            maxSize={5}
            uploadType="resume"
            currentFileUrl={profile?.resume_url}
            isUploading={isUploading}
          />
          {profile?.resume_url && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Resume uploaded successfully
            </p>
          )}
        </CardContent>
      </Card>

      {/* Skills with Checkboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Skills
          </CardTitle>
          <CardDescription>Select your technical and professional skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Skills Display */}
          {selectedSkills.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">Selected Skills ({selectedSkills.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                {selectedSkills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skills Checkboxes */}
          <div>
            <Label className="mb-3 block">Available Skills (Select Multiple)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 border rounded-md">
              {availableSkills.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={skill}
                    checked={selectedSkills.includes(skill)}
                    onCheckedChange={() => handleSkillToggle(skill)}
                  />
                  <label
                    htmlFor={skill}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveSkills} className="w-full">
            Save Skills ({selectedSkills.length} selected)
          </Button>
        </CardContent>
      </Card>

      {/* Education */}
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
            placeholder="e.g. Bachelor's in Computer Science, Stanford University (2018-2022)"
            rows={4}
          />
          <Button onClick={handleUpdateEducation}>Save Education</Button>
        </CardContent>
      </Card>

      {/* Experience */}
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
            placeholder="e.g. Software Engineer at Google (2022-Present)&#10;• Developed web applications&#10;• Led team of 5 developers"
            rows={6}
          />
          <Button onClick={handleUpdateExperience}>Save Experience</Button>
        </CardContent>
      </Card>

      {/* License Information */}
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