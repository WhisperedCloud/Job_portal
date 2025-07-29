
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { MapPin, Clock, Building, Search } from 'lucide-react';
import JobApplicationModal from '../Applications/JobApplicationModal';

const JobListing = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  const mockJobs = [
    {
      id: '1',
      title: 'Frontend Developer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      experience_level: 'experienced',
      skills_required: ['React', 'TypeScript', 'CSS'],
      job_description: 'We are looking for a skilled Frontend Developer to join our team...',
      created_at: '2024-01-15',
    },
    {
      id: '2',
      title: 'React Developer',
      company: 'StartupXYZ',
      location: 'New York, NY',
      experience_level: 'fresher',
      skills_required: ['React', 'JavaScript', 'HTML'],
      job_description: 'Join our dynamic startup as a React Developer...',
      created_at: '2024-01-14',
    },
    {
      id: '3',
      title: 'Full Stack Developer',
      company: 'Innovation Labs',
      location: 'Austin, TX',
      experience_level: 'experienced',
      skills_required: ['Node.js', 'React', 'MongoDB'],
      job_description: 'Looking for a Full Stack Developer to build amazing products...',
      created_at: '2024-01-12',
    },
  ];

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.skills_required.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesExperience = !experienceFilter || experienceFilter === 'all' || job.experience_level === experienceFilter;
    
    return matchesSearch && matchesLocation && matchesExperience;
  });

  const handleApplyNow = (job) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Browse Jobs</h1>
        <p className="text-muted-foreground mt-2">Find your next opportunity</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by job title or skills"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            <div>
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="fresher">Fresher</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button className="w-full">Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Results */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {filteredJobs.length} jobs found
        </div>
        
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {job.company}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {job.created_at}
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {job.job_description.substring(0, 150)}...
                  </p>
                  <div className="flex gap-2 mb-3">
                    {job.skills_required.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <Badge variant={job.experience_level === 'fresher' ? 'default' : 'outline'}>
                    {job.experience_level}
                  </Badge>
                </div>
                <div className="ml-4">
                  <Button onClick={() => handleApplyNow(job)}>Apply Now</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedJob && (
        <JobApplicationModal
          job={selectedJob}
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default JobListing;
