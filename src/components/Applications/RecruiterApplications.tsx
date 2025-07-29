
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { User, FileText, Calendar, Mail, Phone, MapPin, Download } from 'lucide-react';

const RecruiterApplications = () => {
  const [selectedJob, setSelectedJob] = useState('all');

  const mockApplications = [
    {
      id: '1',
      candidateName: 'Andre Koch',
      email: 'andre.koch@email.com',
      phone: '+1 234 567 8900',
      location: 'San Francisco, CA',
      jobTitle: 'Software Engineer',
      appliedDate: 'Mar 23, 2022',
      status: 'under_review',
      experience: '3-5 years',
      tags: ['Imported Merchant', 'Python', 'C++'],
      source: 'Applied through your website\'s jobs page',
    },
    {
      id: '2',
      candidateName: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 234 567 8901',
      location: 'New York, NY',
      jobTitle: 'Frontend Developer',
      appliedDate: 'Mar 22, 2022',
      status: 'new',
      experience: '2-3 years',
      tags: ['React', 'TypeScript', 'CSS'],
      source: 'Applied via LinkedIn',
    },
    {
      id: '3',
      candidateName: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 234 567 8902',
      location: 'Austin, TX',
      jobTitle: 'Full Stack Developer',
      appliedDate: 'Mar 21, 2022',
      status: 'shortlisted',
      experience: '5+ years',
      tags: ['Node.js', 'React', 'MongoDB'],
      source: 'Applied through job portal',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage candidate applications
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {mockApplications.length} applications in queue
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="software-engineer">Software Engineer</SelectItem>
                <SelectItem value="frontend-developer">Frontend Developer</SelectItem>
                <SelectItem value="full-stack-developer">Full Stack Developer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">Choose Action</Button>
            <Button variant="outline">Active</Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="space-y-4">
        {mockApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{application.candidateName}</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Leave feedback</Button>
                      <Button variant="destructive" size="sm">Reject</Button>
                      <Button size="sm">Advance</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2">Candidate details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Applied date:</strong> {application.appliedDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Source:</strong> {application.source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{application.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{application.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{application.location}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Application details</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Position:</strong> {application.jobTitle}</div>
                        <div><strong>Experience:</strong> {application.experience}</div>
                        <div>
                          <strong>Tags:</strong>
                          <div className="flex gap-1 mt-1">
                            {application.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Resume</span>
                        <Button variant="link" size="sm" className="p-0 h-auto text-blue-600">
                          Sample_Resume.pdf ↓
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Application history
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecruiterApplications;
