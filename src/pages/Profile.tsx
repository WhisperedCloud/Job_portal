
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CandidateProfile from '../components/Profile/CandidateProfile';
import RecruiterProfile from '../components/Profile/RecruiterProfile';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';

const Profile = () => {
  const { user } = useAuth();

  const renderProfile = () => {
    switch (user?.role) {
      case 'candidate':
        return <CandidateProfile />;
      case 'recruiter':
        return <RecruiterProfile />;
      default:
        return <div>Profile not available for this user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {renderProfile()}
        </main>
      </div>
    </div>
  );
};

export default Profile;
