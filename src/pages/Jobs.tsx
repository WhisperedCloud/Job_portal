
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import JobListing from '../components/Jobs/JobListing';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';

const Jobs = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <JobListing />
        </main>
      </div>
    </div>
  );
};

export default Jobs;
