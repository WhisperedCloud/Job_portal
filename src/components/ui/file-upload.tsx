// whisperedcloud/job-portal/Job-portal-a4e6f3febf7c2af1c6b0ae3caeec2fd6d7878031/src/components/ui/file-upload.tsx

import React, { useRef, useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  uploadType: 'resume' | 'document' | 'logo';
  currentFileUrl?: string;
  isUploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*/*",
  maxSize = 10,
  uploadType,
  currentFileUrl,
  isUploading = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getUploadText = () => {
    switch (uploadType) {
      case 'resume':
        return {
          title: 'Upload Resume',
          subtitle: 'PDF files only, max 10MB',
          buttonText: 'Choose Resume File'
        };
      case 'document':
        return {
          title: 'Upload Document',
          subtitle: 'PDF, DOC, DOCX files, max 10MB',
          buttonText: 'Choose Document'
        };
      case 'logo':
        return {
          title: 'Upload Company Logo',
          subtitle: 'PNG, JPG, JPEG files, max 5MB',
          buttonText: 'Choose Logo Image'
        };
      default:
        return {
          title: 'Upload File',
          subtitle: `Max ${maxSize}MB`,
          buttonText: 'Choose File'
        };
    }
  };

  const validateFile = (file: File): boolean => {
    // Size validation
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Type validation based on upload type
    if (uploadType === 'resume' && file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file for resume');
      return false;
    }

    if (uploadType === 'logo' && !file.type.startsWith('image/')) {
      toast.error('Please upload an image file for logo');
      return false;
    }

    if (uploadType === 'document' && 
        !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      toast.error('Please upload a PDF, DOC, or DOCX file');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadText = getUploadText();

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed p-6 cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {isUploading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">{uploadText.title}</h3>
            <p className="text-sm text-gray-500">{uploadText.subtitle}</p>
          </div>
          
          <Button 
            type="button" 
            variant="outline" 
            disabled={isUploading}
            className="mt-2"
          >
            {isUploading ? 'Uploading...' : uploadText.buttonText}
          </Button>
          
          <p className="text-xs text-gray-400">
            Or drag and drop your file here
          </p>
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Selected File Display */}
      {selectedFile && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isUploading && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Current File Status */}
      {currentFileUrl && !selectedFile && (
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => window.open(currentFileUrl, '_blank')}
                className="p-0 h-auto"
              >
                View current file
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};