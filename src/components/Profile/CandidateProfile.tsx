import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User, MapPin, GraduationCap, Briefcase, Award } from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidate';
import { FileUpload } from '../ui/file-upload';
import { toast } from 'sonner';

const SKILL_OPTIONS = [
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
  const { profile, loading, updateProfile, uploadFile } = useCandidate();
  const [selectedSkill, setSelectedSkill] = useState('');
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [personalDetails, setPersonalDetails] = useState({ name: '', phone: '' });
  const [locationData, setLocationData] = useState('');
  const [educationData, setEducationData] = useState('');
  const [experienceData, setExperienceData] = useState('');
  const [licenseData, setLicenseData] = useState({ type: '', number: '' });

  useEffect(() => {
    if (profile) {
      setPersonalDetails({ name: profile.name || '', phone: profile.phone || '' });
      setLocationData(profile.location || '');
      setEducationData(profile.education || '');
      setExperienceData(profile.experience || '');
      setLicenseData({ type: profile.license_type || '', number: profile.license_number || '' });
    }
  }, [profile]);

  const handleAddSkill = async () => {
    if (selectedSkill && profile && !profile.skills.includes(selectedSkill)) {
      await updateProfile({ skills: [...profile.skills, selectedSkill] });
      setSelectedSkill('');
    }
  };

  const handleRemoveSkill = async (skill: string) => {
    if (profile) {
      await updateProfile({ skills: profile.skills.filter(s => s !== skill) });
    }
  };

  const handleResumeUpload = async (file: File) => {
    try {
      setIsUploading(true);
      if (!file) return;
      
      // Use the dedicated uploadResume function
      await uploadResume(file);
      
      // No need to manually update profile or show success toast
      // uploadResume handles both automatically
    } catch (error) {
      console.error('Error uploading resume:', error);
      // Error toast is already shown by uploadResume
    } finally {
      setIsUploading(false);
    }
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

      {/* Job Seeking Status */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <h3 className="font-medium">Are you looking for a New job opportunity?</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={isLookingForJob}
                onChange={() => setIsLookingForJob(true)}
                className="text-primary"
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!isLookingForJob}
                onChange={() => setIsLookingForJob(false)}
                className="text-primary"
              />
              No
            </label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="details">MY DETAILS</TabsTrigger>
          <TabsTrigger value="location">MY LOCATION</TabsTrigger>
          <TabsTrigger value="cv">MY CV</TabsTrigger>
          <TabsTrigger value="education">MY EDUCATION</TabsTrigger>
          <TabsTrigger value="license">MY DRIVER'S LICENSE</TabsTrigger>
          <TabsTrigger value="employment">MY EMPLOYMENT</TabsTrigger>
        </TabsList>

        {/* Personal Details */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={personalDetails.name}
                    onChange={e => setPersonalDetails(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Cellular Number</Label>
                  <Input
                    id="phone"
                    value={personalDetails.phone}
                    onChange={e => setPersonalDetails(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleUpdatePersonalDetails}>Update Details</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Current Location</Label>
                <Input
                  id="location"
                  value={locationData}
                  onChange={e => setLocationData(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateLocation}>Update Location</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resume & Skills */}
        <TabsContent value="cv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Resume & Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resume Upload */}
              <div>
                <Label>Resume Upload</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload your resume in PDF, DOC, or DOCX format (Max 5MB)
                </p>
                <FileUpload
                  onFileSelect={handleResumeUpload}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  maxSize={5}
                  uploadType="resume"
                  currentFileUrl={profile?.resume_url}
                  isUploading={isUploading}
                />
                {profile?.resume_url && (
                  <a
                    href={profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 underline mt-2 block text-sm"
                  >
                    View Current Resume
                  </a>
                )}
              </div>

              {/* Skills */}
              <div>
                <Label>Skills</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Add skills that match your expertise
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile?.skills?.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 text-xs hover:text-red-500"
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a skill to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_OPTIONS.filter(skill => !profile?.skills?.includes(skill)).map(skill => (
                        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddSkill} disabled={!selectedSkill}>Add Skill</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Educational Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="education">Education</Label>
                <Textarea
                  id="education"
                  value={educationData}
                  onChange={e => setEducationData(e.target.value)}
                  placeholder="Enter your educational qualifications (degree, institution, year)"
                  rows={5}
                />
              </div>
              <Button onClick={handleUpdateEducation}>Update Education</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* License */}
        <TabsContent value="license">
          <Card>
            <CardHeader>
              <CardTitle>Driver's License</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>License Type</Label>
                <Input
                  value={licenseData.type}
                  onChange={e => setLicenseData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="e.g., Class A, Class B, CDL"
                />
              </div>
              <div>
                <Label>License Number</Label>
                <Input
                  value={licenseData.number}
                  onChange={e => setLicenseData(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="Enter license number"
                />
              </div>
              <Button onClick={handleUpdateLicense}>Update License</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment */}
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" /> Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="experience">Work Experience</Label>
                <Textarea
                  id="experience"
                  value={experienceData}
                  onChange={e => setExperienceData(e.target.value)}
                  placeholder="Describe your work experience (company, role, duration, responsibilities)"
                  rows={6}
                />
              </div>
              <Button onClick={handleUpdateExperience}>Update Experience</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CandidateProfile;

function uploadResume(file: File) {
  throw new Error('Function not implemented.');
}
