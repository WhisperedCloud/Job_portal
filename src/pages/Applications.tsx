import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CandidateApplications from '../components/Applications/CandidateApplications';
import RecruiterApplications from '../components/Applications/RecruiterApplications';
import AdminApplications from '../pages/AllApplications';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import AllApplications from '../pages/AllApplications';

const Applications = () => {
  const { user } = useAuth();

  const renderApplications = () => {
    switch (user?.role) {
      case 'candidate':
        return <CandidateApplications />;
      case 'recruiter':
        return <RecruiterApplications />;
      case 'admin':
        return <AllApplications />;
      default:
        return <div>Applications not available for this user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {renderApplications()}
        </main>
      </div>
    </div>
  );
};

export default Applications;