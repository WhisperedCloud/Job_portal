import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { FileUpload } from '../ui/file-upload';
import { useCandidate } from '@/hooks/useCandidate';
import { useJobApplication } from '@/hooks/useJobApplication';
import { AlertCircle, Loader2 } from 'lucide-react';

interface JobApplicationModalProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JobApplicationModal = ({ job, isOpen, onClose, onSuccess }: JobApplicationModalProps) => {
  const { profile } = useCandidate();
  const { isSubmitting, uploadProgress, submitApplication } = useJobApplication();
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleResumeSelect = (file: File) => {
    console.log('Resume file selected:', file.name);
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeFile) {
      return;
    }

    try {
      await submitApplication(job.id, resumeFile, coverLetter);
      
      // Reset form
      setCoverLetter('');
      setResumeFile(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Application submission failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {job.title}</DialogTitle>
          {job.recruiter?.company_name && (
            <p className="text-sm text-muted-foreground">
              at {job.recruiter.company_name}
            </p>
          )}
        </DialogHeader>
        
        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-800">{uploadProgress}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Summary */}
          <div className="bg-muted p-4 rounded-md space-y-2">
            <h3 className="font-medium text-sm">Your Application Profile</h3>
            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {profile?.name || 'Not set'}</p>
              <p><strong>Phone:</strong> {profile?.phone || 'Not set'}</p>
              <p><strong>Location:</strong> {profile?.location || 'Not set'}</p>
              {profile?.skills && profile.skills.length > 0 && (
                <p><strong>Skills:</strong> {profile.skills.join(', ')}</p>
              )}
              {profile?.resume_url && (
                <p>
                  <strong>Current Resume:</strong>{' '}
                  <a 
                    href={profile.resume_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Profile Resume
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <Label htmlFor="coverLetter">
              Cover Letter <span className="text-muted-foreground">(Optional but recommended)</span>
            </Label>
            <Textarea
              id="coverLetter"
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell the employer why you're interested in this position and what makes you a great fit for their team..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              A well-written cover letter increases your chances of getting noticed.
            </p>
          </div>

          {/* Resume Upload */}
          <div>
            <Label className="text-base font-medium">
              Resume Upload *
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Upload a resume for this specific application (PDF, DOC, DOCX - Max 5MB)
            </p>
            <div className="mt-2">
              <FileUpload
                onFileSelect={handleResumeSelect}
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                maxSize={5}
                uploadType="resume"
                isUploading={isSubmitting}
              />
              {resumeFile && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    ✓ Selected: <strong>{resumeFile.name}</strong> ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Application Details</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your profile information will be shared with the employer</li>
                  <li>This resume will be saved to your applications folder</li>
                  <li>You can track this application in "My Applications"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !resumeFile}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress || 'Submitting...'}
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationModal;