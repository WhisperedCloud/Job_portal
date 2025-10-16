import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Eye, Briefcase, MapPin, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { useRecruiter } from '@/hooks/useRecruiter';
import { supabase } from '@/integrations/supabase/client';
import { notifyCandidatesOnJobPost } from '@/utils/notifyCandidatesOnJobPost';

const CreateJob = () => {
  const { user } = useAuth();
  const { createJob } = useRecruiter();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    qualification: '',
    experience_level: '',
    notice_period: '',
    job_description: '',
    location: '',
    job_type: '',
    salary_range: '',
    application_deadline: '',
    contact_email: user?.email || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  // Calculate form completion percentage
  const calculateProgress = () => {
    const requiredFields = [
      formData.title,
      formData.company_name,
      formData.location,
      formData.job_type,
      formData.qualification,
      formData.experience_level,
      formData.job_description,
      formData.contact_email,
    ];
    
    const filledFields = requiredFields.filter(field => field.trim() !== '').length;
    const totalFields = requiredFields.length;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const progress = calculateProgress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const jobData = {
      title: formData.title,
      company_name: formData.company_name,
      qualification: formData.qualification,
      experience_level: formData.experience_level,
      notice_period: formData.notice_period,
      job_description: formData.job_description,
      skills_required: skills,
      location: formData.location,
      job_type: formData.job_type,
      salary_range: formData.salary_range,
      application_deadline: formData.application_deadline,
      contact_email: formData.contact_email,
    };

    try {
      // Create job and get the created job object
      const createdJob = await createJob(jobData);

      // Notify candidates whose skills match the posted job
      if (createdJob && createdJob.id) {
        await notifyCandidatesOnJobPost(supabase, {
          ...createdJob,
          skills_required: skills,
          company_name: formData.company_name,
          location: formData.location,
        });
      }

      navigate('/jobs/posted');
    } catch (error) {
      console.error('Job submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'recruiter') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">This page is only available for recruiters.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Post A Job</h1>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Preview Job Post</h2>
                <p className="text-sm text-muted-foreground">Preview your post before you publish.</p>
                <Button 
                  className="mt-2 bg-gray-600 hover:bg-gray-700"
                  onClick={() => setShowPreview(true)}
                  disabled={progress < 100}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  PREVIEW
                </Button>
              </div>
            </div>

            {/* Progress Indicator */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${progress === 100 ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-gray-700">Form Completion</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {progress === 100 
                      ? '✅ All required fields completed! You can now preview and post your job.' 
                      : `${8 - Math.round((progress / 100) * 8)} required fields remaining`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                  <CardDescription>Provide information about the job position</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Title + Company */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Software Engineer"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        placeholder="e.g. OpenAI"
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Location + Job Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g. Remote or San Francisco, CA"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="job_type">Job Type *</Label>
                      <Select value={formData.job_type} onValueChange={(v) => handleInputChange('job_type', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-Time</SelectItem>
                          <SelectItem value="part-time">Part-Time</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Qualification + Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="qualification">Qualification *</Label>
                      <Select value={formData.qualification} onValueChange={(v) => handleInputChange('qualification', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bachelors">Bachelor's</SelectItem>
                          <SelectItem value="masters">Master's</SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="experience_level">Experience Level *</Label>
                      <Select value={formData.experience_level} onValueChange={(v) => handleInputChange('experience_level', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fresher">Fresher</SelectItem>
                          <SelectItem value="experienced">Experienced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Salary + Deadline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="salary_range">Salary Range</Label>
                      <Input
                        id="salary_range"
                        placeholder="e.g. ₹6 LPA - ₹12 LPA"
                        value={formData.salary_range}
                        onChange={(e) => handleInputChange('salary_range', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="application_deadline">Application Deadline</Label>
                      <Input
                        id="application_deadline"
                        type="date"
                        value={formData.application_deadline}
                        onChange={(e) => handleInputChange('application_deadline', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Notice period */}
                  <div>
                    <Label htmlFor="notice_period">Preferred Notice Period</Label>
                    <Select value={formData.notice_period} onValueChange={(v) => handleInputChange('notice_period', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select notice period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="15-days">15 Days</SelectItem>
                        <SelectItem value="1-month">1 Month</SelectItem>
                        <SelectItem value="2-months">2 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skills */}
                  <div>
                    <Label>Required Skills</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter skill and press Enter"
                          value={currentSkill}
                          onChange={(e) => setCurrentSkill(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <Button type="button" onClick={addSkill} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="flex items-center gap-1">
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="job_description">Job Description *</Label>
                    <Textarea
                      id="job_description"
                      placeholder="Describe the role, responsibilities, and benefits..."
                      rows={6}
                      value={formData.job_description}
                      onChange={(e) => handleInputChange('job_description', e.target.value)}
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/jobs/posted')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || progress < 100}>
                  {loading ? 'Posting...' : 'Post Job'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Post Preview</DialogTitle>
            <DialogDescription>
              This is how your job posting will appear to candidates
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Job Header */}
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {formData.title || 'Job Title'}
              </h1>
              <p className="text-xl text-gray-600">
                {formData.company_name || 'Company Name'}
              </p>
            </div>

            {/* Job Meta Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-5 w-5" />
                <span>{formData.location || 'Location'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase className="h-5 w-5" />
                <span className="capitalize">{formData.job_type?.replace('-', ' ') || 'Job Type'}</span>
              </div>
              {formData.salary_range && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-5 w-5" />
                  <span>{formData.salary_range}</span>
                </div>
              )}
              {formData.application_deadline && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>Apply by {new Date(formData.application_deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Qualification</h3>
                <p className="text-gray-600 capitalize">{formData.qualification || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Experience Level</h3>
                <p className="text-gray-600 capitalize">{formData.experience_level || 'Not specified'}</p>
              </div>
              {formData.notice_period && (
                <div>
                  <h3 className="font-semibold mb-2">Notice Period</h3>
                  <p className="text-gray-600">{formData.notice_period}</p>
                </div>
              )}
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Job Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {formData.job_description || 'No description provided'}
              </p>
            </div>

            {/* Contact */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Contact</h3>
              <p className="text-gray-600">{formData.contact_email}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
            <Button onClick={() => {
              setShowPreview(false);
              // You can trigger form submission here if needed
            }}>
              Looks Good, Post Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateJob;