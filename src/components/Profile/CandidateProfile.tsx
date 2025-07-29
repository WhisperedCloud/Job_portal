
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, User, MapPin, GraduationCap, Briefcase, Award, FileText } from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidate';
import { FileUpload } from '../ui/file-upload';
import { toast } from 'sonner';

// Predefined skills list
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

  // Form states for each section
  const [personalDetails, setPersonalDetails] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    idPassport: '',
    gender: '',
    age: ''
  });

  const [locationData, setLocationData] = useState('');
  const [educationData, setEducationData] = useState('');
  const [experienceData, setExperienceData] = useState('');
  const [licenseData, setLicenseData] = useState({
    type: '',
    number: ''
  });

  useEffect(() => {
    if (profile) {
      setPersonalDetails(prev => ({
        ...prev,
        name: profile.name || '',
        phone: profile.phone || ''
      }));
      setLocationData(profile.location || '');
      setEducationData(profile.education || '');
      setExperienceData(profile.experience || '');
      setLicenseData({
        type: profile.license_type || '',
        number: profile.license_number || ''
      });
    }
  }, [profile]);

  const handleAddSkill = async () => {
    if (selectedSkill && profile && !profile.skills.includes(selectedSkill)) {
      const updatedSkills = [...profile.skills, selectedSkill];
      await updateProfile({ skills: updatedSkills });
      setSelectedSkill('');
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (profile) {
      const updatedSkills = profile.skills.filter(skill => skill !== skillToRemove);
      await updateProfile({ skills: updatedSkills });
    }
  };

  const handleResumeUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const resumeUrl = await uploadFile(file, 'resumes', 'profiles/');
      await updateProfile({ resume_url: resumeUrl });
      toast.success('Resume uploaded successfully');
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePersonalDetails = async () => {
    try {
      await updateProfile({ 
        name: personalDetails.name, 
        phone: personalDetails.phone 
      });
    } catch (error) {
      console.error('Error updating personal details:', error);
    }
  };

  const handleUpdateLocation = async () => {
    try {
      await updateProfile({ location: locationData });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleUpdateEducation = async () => {
    try {
      await updateProfile({ education: educationData });
    } catch (error) {
      console.error('Error updating education:', error);
    }
  };

  const handleUpdateExperience = async () => {
    try {
      await updateProfile({ experience: experienceData });
    } catch (error) {
      console.error('Error updating experience:', error);
    }
  };

  const handleUpdateLicense = async () => {
    try {
      await updateProfile({ 
        license_type: licenseData.type, 
        license_number: licenseData.number 
      });
    } catch (error) {
      console.error('Error updating license:', error);
    }
  };

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
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Are you looking for a New job opportunity?</h3>
            </div>
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

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={personalDetails.name}
                    onChange={(e) => setPersonalDetails(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Surname</Label>
                  <Input 
                    id="surname" 
                    value={personalDetails.surname}
                    onChange={(e) => setPersonalDetails(prev => ({ ...prev, surname: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalDetails.email}
                    onChange={(e) => setPersonalDetails(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Cellular Number</Label>
                  <Input
                    id="phone"
                    value={personalDetails.phone}
                    onChange={(e) => setPersonalDetails(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID / Passport Number</Label>
                  <Input 
                    value={personalDetails.idPassport}
                    onChange={(e) => setPersonalDetails(prev => ({ ...prev, idPassport: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="gender" 
                        value="male"
                        checked={personalDetails.gender === 'male'}
                        onChange={(e) => setPersonalDetails(prev => ({ ...prev, gender: e.target.value }))}
                      />
                      Male
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="gender" 
                        value="female"
                        checked={personalDetails.gender === 'female'}
                        onChange={(e) => setPersonalDetails(prev => ({ ...prev, gender: e.target.value }))}
                      />
                      Female
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input 
                  id="age" 
                  type="number"
                  value={personalDetails.age}
                  onChange={(e) => setPersonalDetails(prev => ({ ...prev, age: e.target.value }))}
                />
              </div>

              <Button onClick={handleUpdatePersonalDetails}>
                Update Details
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location">Current Location</Label>
                  <Input
                    id="location"
                    value={locationData}
                    onChange={(e) => setLocationData(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateLocation}>
                  Update Location
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Resume & Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resume Upload */}
              <div>
                <Label>Resume Upload</Label>
                <div className="mt-2">
                  <FileUpload
                    onFileSelect={handleResumeUpload}
                    accept=".pdf"
                    maxSize={10}
                    uploadType="resume"
                    currentFileUrl={profile?.resume_url}
                    isUploading={isUploading}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <Label>Skills</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile?.skills?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a skill to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_OPTIONS
                        .filter(skill => !profile?.skills?.includes(skill))
                        .map((skill) => (
                          <SelectItem key={skill} value={skill}>
                            {skill}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddSkill} disabled={!selectedSkill}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Educational Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    value={educationData}
                    onChange={(e) => setEducationData(e.target.value)}
                    placeholder="Enter your educational qualifications"
                  />
                </div>
                <Button onClick={handleUpdateEducation}>
                  Update Education
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license">
          <Card>
            <CardHeader>
              <CardTitle>Driver's License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>License Type</Label>
                  <Input 
                    value={licenseData.type}
                    onChange={(e) => setLicenseData(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Enter license type" 
                  />
                </div>
                <div>
                  <Label>License Number</Label>
                  <Input 
                    value={licenseData.number}
                    onChange={(e) => setLicenseData(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="Enter license number" 
                  />
                </div>
                <Button onClick={handleUpdateLicense}>
                  Update License
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="experience">Work Experience</Label>
                  <Textarea
                    id="experience"
                    value={experienceData}
                    onChange={(e) => setExperienceData(e.target.value)}
                    placeholder="Describe your work experience"
                  />
                </div>
                <Button onClick={handleUpdateExperience}>
                  Update Experience
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CandidateProfile;
